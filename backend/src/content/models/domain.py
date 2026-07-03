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
    PENDING = 'pending'
    READY = 'ready'
    ERRORED = 'errored'


@dataclass(frozen=True, slots=True)
class MediaAsset:
    id: str
    content_id: str
    provider: str
    provider_uid: str
    status: MediaStatus
    playback_hls_url: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    error: str | None = None


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
