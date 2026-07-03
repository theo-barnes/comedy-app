from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from .models.domain import EngagementEvent, EngagementEventType, SavedItem


class SavedItemSchema(BaseModel):
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
    items: list[SavedItemSchema]


class AnalyticsEventSchema(BaseModel):
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
    events: list[AnalyticsEventSchema] = Field(..., max_length=50)


class AnalyticsBatchResponse(BaseModel):
    accepted: int
