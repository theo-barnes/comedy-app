from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class EngagementEventType(str, Enum):
    VIDEO_VIEWED = 'video_viewed'
    VIDEO_COMPLETED = 'video_completed'
    VIDEO_SHARED = 'video_shared'
    PROFILE_VIEWED = 'profile_viewed'
    TICKET_CLICKED = 'ticket_clicked'


@dataclass(frozen=True, slots=True)
class SavedItem:
    content_id: str
    saved_at: datetime
    title: str
    content_type: str
    creator_id: str
    thumbnail_url: str | None = None
    image_url: str | None = None


@dataclass(frozen=True, slots=True)
class EngagementEvent:
    event_type: EngagementEventType
    occurred_at: datetime
    content_id: str | None = None
    user_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
