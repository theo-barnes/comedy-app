"""API request/response schemas for saves and analytics-event batches."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from .models.domain import EngagementEvent, EngagementEventType, SavedItem


class SavedItemSchema(BaseModel):
    """Wire schema for a single saved content item."""

    contentId: str
    savedAt: datetime
    title: str
    contentType: str
    creatorId: str
    thumbnailUrl: str | None = None
    imageUrl: str | None = None

    @staticmethod
    def from_domain(item: SavedItem) -> 'SavedItemSchema':
        return SavedItemSchema(
            contentId=item.content_id,
            savedAt=item.saved_at,
            title=item.title,
            contentType=item.content_type,
            creatorId=item.creator_id,
            thumbnailUrl=item.thumbnail_url,
            imageUrl=item.image_url,
        )


class SavedListResponse(BaseModel):
    """Wire schema for GET /me/saved."""

    items: list[SavedItemSchema]


class AnalyticsEventSchema(BaseModel):
    """Wire schema for a single client-reported analytics event."""

    eventType: EngagementEventType
    occurredAt: datetime
    contentId: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    def to_domain(self) -> EngagementEvent:
        return EngagementEvent(
            event_type=self.eventType,
            occurred_at=self.occurredAt,
            content_id=self.contentId,
            metadata=self.metadata,
        )


class AnalyticsBatchRequest(BaseModel):
    """Body for POST /analytics/events (or wherever the batch endpoint is mounted)."""

    events: list[AnalyticsEventSchema] = Field(..., max_length=50)


class AnalyticsBatchResponse(BaseModel):
    """Response confirming how many events were accepted."""

    accepted: int
