from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class ContentType(str, Enum):
    VIDEO_CLIP = 'video_clip'
    IMAGE = 'image'
    EVENT_PROMOTION = 'event_promotion'
    ANNOUNCEMENT = 'announcement'


class ContentStatus(str, Enum):
    DRAFT = 'draft'
    PROCESSING = 'processing'
    PUBLISHED = 'published'
    REMOVED = 'removed'


class ContentVisibility(str, Enum):
    PUBLIC = 'public'
    UNLISTED = 'unlisted'


class MediaStatus(str, Enum):
    PENDING_UPLOAD = 'pending_upload'
    PENDING = 'pending_upload'
    UPLOADED = 'uploaded'
    PROCESSING = 'processing'
    READY = 'ready'
    FAILED = 'failed'
    ERRORED = 'failed'
    EXPIRED = 'expired'
    CANCELLED = 'cancelled'


@dataclass(frozen=True, slots=True)
class MediaAsset:
    id: str
    content_id: str
    provider: str
    provider_uid: str
    status: MediaStatus
    attempt_number: int = 1
    is_current: bool = True
    upload_protocol: str = 'tus'
    upload_expires_at: datetime | None = None
    source_mime_type: str | None = None
    source_size_bytes: int | None = None
    original_filename: str | None = None
    playback_hls_url: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    error: str | None = None
    provider_error_code: str | None = None
    uploaded_at: datetime | None = None
    processing_started_at: datetime | None = None
    ready_at: datetime | None = None
    failed_at: datetime | None = None
    last_provider_sync_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class Content:
    id: str
    creator_id: str
    type: ContentType
    title: str
    status: ContentStatus
    visibility: ContentVisibility
    description: str | None = None
    event_id: str | None = None
    place_id: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    h3_index: str | None = None
    image_url: str | None = None
    published_at: datetime | None = None
    created_at: datetime | None = None
    media: MediaAsset | None = None
