from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from .models.domain import Content

ContentTypeLiteral = Literal['video_clip', 'image', 'event_promotion', 'announcement']


class CreateContentRequest(BaseModel):
    type: ContentTypeLiteral
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    visibility: Literal['public', 'unlisted'] = 'public'
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    eventId: str | None = None
    imageUrl: str | None = Field(None, max_length=1000)


class MediaSchema(BaseModel):
    status: str
    hlsUrl: str | None = None
    thumbnailUrl: str | None = None
    durationSeconds: float | None = None


class ContentSchema(BaseModel):
    id: str
    creatorId: str
    type: ContentTypeLiteral
    title: str
    description: str | None = None
    status: str
    visibility: str
    eventId: str | None = None
    placeId: str | None = None
    imageUrl: str | None = None
    publishedAt: datetime | None = None
    createdAt: datetime | None = None
    media: MediaSchema | None = None

    @staticmethod
    def from_domain(content: Content) -> 'ContentSchema':
        media = None
        if content.media is not None:
            media = MediaSchema(
                status=content.media.status.value,
                hlsUrl=content.media.playback_hls_url,
                thumbnailUrl=content.media.thumbnail_url,
                durationSeconds=content.media.duration_seconds,
            )
        return ContentSchema(
            id=content.id,
            creatorId=content.creator_id,
            type=content.type.value,
            title=content.title,
            description=content.description,
            status=content.status.value,
            visibility=content.visibility.value,
            eventId=content.event_id,
            placeId=content.place_id,
            imageUrl=content.image_url,
            publishedAt=content.published_at,
            createdAt=content.created_at,
            media=media,
        )


class CreateContentResponse(BaseModel):
    content: ContentSchema
    uploadUrl: str | None = None


class ContentListResponse(BaseModel):
    items: list[ContentSchema]
