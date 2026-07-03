from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from .models.domain import ComedianSummary, FeedItem, HomeFeed, LinkedEvent, NearbyEvent


class LinkedEventSchema(BaseModel):
    id: str
    title: str
    startTime: datetime
    venueId: str
    ticketUrl: str | None = None

    @staticmethod
    def from_domain(event: LinkedEvent) -> 'LinkedEventSchema':
        return LinkedEventSchema(
            id=event.id,
            title=event.title,
            startTime=event.start_time,
            venueId=event.venue_id,
            ticketUrl=event.ticket_url,
        )


class FeedItemSchema(BaseModel):
    contentId: str
    contentType: str
    title: str
    creatorId: str
    creatorName: str
    publishedAt: datetime
    hlsUrl: str | None = None
    thumbnailUrl: str | None = None
    imageUrl: str | None = None
    linkedEvent: LinkedEventSchema | None = None
    likeCount: int = 0
    saveCount: int = 0
    viewerLiked: bool = False
    viewerSaved: bool = False

    @staticmethod
    def from_domain(item: FeedItem) -> 'FeedItemSchema':
        return FeedItemSchema(
            contentId=item.content_id,
            contentType=item.content_type,
            title=item.title,
            creatorId=item.creator_id,
            creatorName=item.creator_name,
            publishedAt=item.published_at,
            hlsUrl=item.hls_url,
            thumbnailUrl=item.thumbnail_url,
            imageUrl=item.image_url,
            linkedEvent=(
                LinkedEventSchema.from_domain(item.linked_event)
                if item.linked_event is not None
                else None
            ),
            likeCount=item.like_count,
            saveCount=item.save_count,
            viewerLiked=item.viewer_liked,
            viewerSaved=item.viewer_saved,
        )


class VideoFeedResponse(BaseModel):
    items: list[FeedItemSchema]
    nextCursor: str | None = None


class NearbyEventSchema(BaseModel):
    id: str
    title: str
    startTime: datetime
    venueId: str
    venueName: str
    ticketUrl: str | None = None
    latitude: float | None = None
    longitude: float | None = None

    @staticmethod
    def from_domain(event: NearbyEvent) -> 'NearbyEventSchema':
        return NearbyEventSchema(
            id=event.id,
            title=event.title,
            startTime=event.start_time,
            venueId=event.venue_id,
            venueName=event.venue_name,
            ticketUrl=event.ticket_url,
            latitude=event.latitude,
            longitude=event.longitude,
        )


class ComedianSummarySchema(BaseModel):
    userId: str
    stageName: str
    bio: str | None = None

    @staticmethod
    def from_domain(comedian: ComedianSummary) -> 'ComedianSummarySchema':
        return ComedianSummarySchema(
            userId=comedian.user_id, stageName=comedian.stage_name, bio=comedian.bio
        )


class HomeFeedResponse(BaseModel):
    nearbyEvents: list[NearbyEventSchema] = Field(default_factory=list)
    trendingClips: list[FeedItemSchema] = Field(default_factory=list)
    followedCreators: list[FeedItemSchema] = Field(default_factory=list)
    newComedians: list[ComedianSummarySchema] = Field(default_factory=list)

    @staticmethod
    def from_domain(feed: HomeFeed) -> 'HomeFeedResponse':
        return HomeFeedResponse(
            nearbyEvents=[NearbyEventSchema.from_domain(e) for e in feed.nearby_events],
            trendingClips=[FeedItemSchema.from_domain(i) for i in feed.trending_clips],
            followedCreators=[
                FeedItemSchema.from_domain(i) for i in feed.followed_creators
            ],
            newComedians=[ComedianSummarySchema.from_domain(c) for c in feed.new_comedians],
        )
