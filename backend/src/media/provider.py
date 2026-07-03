from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol


class MediaProviderError(Exception):
    """Raised when the upstream media provider rejects a request."""


@dataclass(frozen=True, slots=True)
class DirectUpload:
    upload_url: str
    provider_uid: str


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

    def create_direct_upload(self, *, max_duration_seconds: int) -> DirectUpload: ...

    def verify_webhook(self, body: bytes, signature_header: str | None) -> bool: ...

    def parse_webhook(self, payload: dict[str, Any]) -> WebhookEvent: ...
