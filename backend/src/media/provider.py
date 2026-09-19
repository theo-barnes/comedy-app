from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol


class MediaProviderError(Exception):
    """Raised when the upstream media provider rejects a request."""


@dataclass(frozen=True, slots=True)
class DirectUpload:
    upload_url: str
    provider_uid: str
    protocol: str = 'tus'
    expires_at: datetime | None = None
    headers: dict[str, str] | None = None
    media_asset_id: str | None = None


@dataclass(frozen=True, slots=True)
class ProviderStatus:
    provider_uid: str
    state: str
    ready: bool = False
    playback_hls_url: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    error_code: str | None = None
    error: str | None = None


@dataclass(frozen=True, slots=True)
class WebhookEvent:
    """Provider-agnostic result of parsing a processing webhook."""

    provider_uid: str
    ready: bool
    playback_hls_url: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    error: str | None = None


class MediaProvider(Protocol):
    """Boundary to the video hosting/transcoding provider."""

    name: str

    def create_direct_upload(
        self,
        *,
        max_duration_seconds: int,
        size_bytes: int | None = None,
        mime_type: str | None = None,
    ) -> DirectUpload: ...

    def get_status(self, provider_uid: str) -> ProviderStatus: ...

    def delete_asset(self, provider_uid: str) -> None: ...

    def verify_webhook(self, body: bytes, signature_header: str | None) -> bool: ...

    def parse_webhook(self, payload: dict[str, Any]) -> WebhookEvent: ...
