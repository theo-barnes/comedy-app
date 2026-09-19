from __future__ import annotations

import hashlib
import hmac
import time
import base64
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

from .provider import DirectUpload, MediaProviderError, ProviderStatus, WebhookEvent

_API_BASE = 'https://api.cloudflare.com/client/v4'
# Reject webhooks older than this to limit replay windows.
_MAX_WEBHOOK_AGE_SECONDS = 5 * 60


class CloudflareStreamProvider:
    """Cloudflare Stream: direct creator uploads, HLS playback, webhooks.

    Docs: https://developers.cloudflare.com/stream/
    """

    name = 'cloudflare_stream'

    def __init__(
        self,
        account_id: str,
        api_token: str,
        webhook_secret: str,
        timeout_seconds: float = 10.0,
    ) -> None:
        self._account_id = account_id
        self._api_token = api_token
        self._webhook_secret = webhook_secret
        self._timeout = timeout_seconds

    def create_direct_upload(
        self,
        *,
        max_duration_seconds: int,
        size_bytes: int | None = None,
        mime_type: str | None = None,
    ) -> DirectUpload:
        if size_bytes is None:
            return self._create_basic_upload(max_duration_seconds)

        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        metadata = {
            'maxDurationSeconds': str(max_duration_seconds),
            'expiry': expires_at.isoformat(),
        }
        encoded_metadata = ','.join(
            f'{key} {base64.b64encode(value.encode()).decode()}'
            for key, value in metadata.items()
        )
        url = f'{_API_BASE}/accounts/{self._account_id}/stream?direct_user=true'
        try:
            response = requests.post(
                url,
                headers={
                    'Authorization': f'Bearer {self._api_token}',
                    'Tus-Resumable': '1.0.0',
                    'Upload-Length': str(size_bytes),
                    'Upload-Metadata': encoded_metadata,
                },
                timeout=self._timeout,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise MediaProviderError(f'cloudflare tus upload failed: {exc}') from exc
        upload_url = response.headers.get('Location')
        if not upload_url:
            raise MediaProviderError('cloudflare tus upload response missing Location')
        provider_uid = upload_url.rstrip('/').split('/')[-1]
        return DirectUpload(
            upload_url=upload_url,
            provider_uid=provider_uid,
            expires_at=expires_at,
            headers={'Tus-Resumable': '1.0.0'},
        )

    def _create_basic_upload(self, max_duration_seconds: int) -> DirectUpload:
        url = f'{_API_BASE}/accounts/{self._account_id}/stream/direct_upload'
        try:
            response = requests.post(
                url,
                headers={'Authorization': f'Bearer {self._api_token}'},
                json={'maxDurationSeconds': max_duration_seconds},
                timeout=self._timeout,
            )
            response.raise_for_status()
            body = response.json()
        except requests.RequestException as exc:
            raise MediaProviderError(f'cloudflare direct upload failed: {exc}') from exc
        if not body.get('success'):
            raise MediaProviderError(f'cloudflare direct upload rejected: {body.get("errors")}')
        result = body['result']
        return DirectUpload(
            upload_url=result['uploadURL'],
            provider_uid=result['uid'],
            protocol='multipart',
        )

    def get_status(self, provider_uid: str) -> ProviderStatus:
        url = f'{_API_BASE}/accounts/{self._account_id}/stream/{provider_uid}'
        try:
            response = requests.get(
                url,
                headers={'Authorization': f'Bearer {self._api_token}'},
                timeout=self._timeout,
            )
            response.raise_for_status()
            result = response.json()['result']
        except (requests.RequestException, KeyError, ValueError) as exc:
            raise MediaProviderError(f'cloudflare status request failed: {exc}') from exc
        parsed = self.parse_webhook(result)
        state = (result.get('status') or {}).get('state', 'processing')
        return ProviderStatus(
            provider_uid=provider_uid,
            state=state,
            ready=parsed.ready,
            playback_hls_url=parsed.playback_hls_url,
            thumbnail_url=parsed.thumbnail_url,
            duration_seconds=parsed.duration_seconds,
            width=parsed.width,
            height=parsed.height,
            error=parsed.error,
            error_code=(result.get('status') or {}).get('errReasonCode'),
        )

    def delete_asset(self, provider_uid: str) -> None:
        url = f'{_API_BASE}/accounts/{self._account_id}/stream/{provider_uid}'
        try:
            response = requests.delete(
                url,
                headers={'Authorization': f'Bearer {self._api_token}'},
                timeout=self._timeout,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise MediaProviderError(f'cloudflare delete failed: {exc}') from exc

    def verify_webhook(self, body: bytes, signature_header: str | None) -> bool:
        """Verify Cloudflare's ``Webhook-Signature: time=<ts>,sig1=<hex>`` header."""

        if not self._webhook_secret or not signature_header:
            return False
        parts = dict(
            part.split('=', 1) for part in signature_header.split(',') if '=' in part
        )
        timestamp = parts.get('time')
        signature = parts.get('sig1')
        if not timestamp or not signature:
            return False
        try:
            age = time.time() - int(timestamp)
        except ValueError:
            return False
        if age > _MAX_WEBHOOK_AGE_SECONDS or age < -60:
            return False
        expected = hmac.new(
            self._webhook_secret.encode(),
            f'{timestamp}.'.encode() + body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_webhook(self, payload: dict[str, Any]) -> WebhookEvent:
        uid = payload.get('uid')
        if not uid:
            raise MediaProviderError('webhook payload missing uid')
        state = (payload.get('status') or {}).get('state', '')
        ready = bool(payload.get('readyToStream')) or state == 'ready'
        if state == 'error':
            error = (payload.get('status') or {}).get('errorReasonText') or 'processing failed'
            return WebhookEvent(provider_uid=uid, ready=False, error=error)
        playback = payload.get('playback') or {}
        input_meta = payload.get('input') or {}
        return WebhookEvent(
            provider_uid=uid,
            ready=ready,
            playback_hls_url=playback.get('hls'),
            thumbnail_url=payload.get('thumbnail'),
            duration_seconds=payload.get('duration'),
            width=input_meta.get('width'),
            height=input_meta.get('height'),
        )
