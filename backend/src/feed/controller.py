from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from shared.auth import AuthenticatedUser, get_current_user

from .factory import get_service
from .schemas import FeedItemSchema, HomeFeedResponse, VideoFeedResponse
from .service import FeedService

router = APIRouter(tags=['feed'])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Service = Annotated[FeedService, Depends(get_service)]


@router.get('/feed/videos', response_model=VideoFeedResponse)
def video_feed(
    user: CurrentUser,
    service: Service,
    lat: float | None = Query(None, ge=-90, le=90),
    lng: float | None = Query(None, ge=-180, le=180),
    cursor: str | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
) -> VideoFeedResponse:
    page = service.feed_videos(user.user_id, lat=lat, lng=lng, cursor=cursor, limit=limit)
    return VideoFeedResponse(
        items=[FeedItemSchema.from_domain(i) for i in page.items],
        nextCursor=page.next_cursor,
    )


@router.get('/feed/home', response_model=HomeFeedResponse)
def home_feed(
    user: CurrentUser,
    service: Service,
    lat: float | None = Query(None, ge=-90, le=90),
    lng: float | None = Query(None, ge=-180, le=180),
) -> HomeFeedResponse:
    return HomeFeedResponse.from_domain(service.home_feed(user.user_id, lat=lat, lng=lng))
