from __future__ import annotations

from typing import Any
from uuid import uuid4

from .provider import DirectUpload, MediaProviderError, WebhookEvent


class StubMediaProvider:
    """In-memory media provider for tests and local development."""

    name = 'stub'

    def __init__(self) -> None:
        self.uploads: list[DirectUpload] = []

    def create_direct_upload(self, *, max_duration_seconds: int) -> DirectUpload:
        upload = DirectUpload(
            upload_url=f'https://stub.upload.local/{uuid4()}',
            provider_uid=uuid4().hex,
        )
        self.uploads.append(upload)
        return upload

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
