from __future__ import annotations

from typing import Any
from uuid import uuid4

from datetime import datetime, timedelta, timezone

from .provider import DirectUpload, MediaProviderError, ProviderStatus, WebhookEvent


class StubMediaProvider:
    """In-memory media provider for tests and local development."""

    name = 'stub'

    def __init__(self) -> None:
        self.uploads: list[DirectUpload] = []

    def create_direct_upload(
        self,
        *,
        max_duration_seconds: int,
        size_bytes: int | None = None,
        mime_type: str | None = None,
    ) -> DirectUpload:
        provider_uid = uuid4().hex
        upload = DirectUpload(
            upload_url=f'https://stub.upload.local/{provider_uid}',
            provider_uid=provider_uid,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            headers={'Tus-Resumable': '1.0.0'},
        )
        self.uploads.append(upload)
        return upload

    def get_status(self, provider_uid: str) -> ProviderStatus:
        return ProviderStatus(provider_uid=provider_uid, state='processing')

    def delete_asset(self, provider_uid: str) -> None:
        self.uploads = [upload for upload in self.uploads if upload.provider_uid != provider_uid]

    def verify_webhook(self, body: bytes, signature_header: str | None) -> bool:
        return True

    def parse_webhook(self, payload: dict[str, Any]) -> WebhookEvent:
        uid = payload.get('uid')
        if not uid:
            raise MediaProviderError('webhook payload missing uid')
        return WebhookEvent(
            provider_uid=uid,
            ready=payload.get('ready', True),
            playback_hls_url=payload.get('hls', f'https://stub.cdn.local/{uid}/index.m3u8'),
            thumbnail_url=payload.get('thumbnail'),
            duration_seconds=payload.get('duration'),
            error=payload.get('error'),
        )
