from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any

import requests

from .provider import DirectUpload, MediaProviderError, WebhookEvent

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

    def create_direct_upload(self, *, max_duration_seconds: int) -> DirectUpload:
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
        return DirectUpload(upload_url=result['uploadURL'], provider_uid=result['uid'])

    def verify_webhook(self, body: bytes, signature_header: str | None) -> bool:
        """Verify Cloudflare's ``Webhook-Signature: time=<ts>,sig1=<hex>`` header."""

        if not signature_header:
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
        if age > _MAX_WEBHOOK_AGE_SECONDS:
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
