from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from shared.auth import AuthenticatedUser, get_current_user
from shared.ratelimit import RateLimiter

from .factory import get_service
from .schemas import (
    AnalyticsBatchRequest,
    AnalyticsBatchResponse,
    SavedItemSchema,
    SavedListResponse,
)
from .service import EngagementService

router = APIRouter(tags=['engagement'])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Service = Annotated[EngagementService, Depends(get_service)]


@lru_cache(maxsize=1)
def _analytics_limiter() -> RateLimiter:
    from shared.cache import create_cache
    from shared.config import settings

    return RateLimiter(create_cache(settings.redis_url), limit=60, window_seconds=60)


@router.post('/content/{content_id}/save', status_code=status.HTTP_204_NO_CONTENT)
def save_content(content_id: str, user: CurrentUser, service: Service) -> None:
    service.save(user, content_id)


@router.delete('/content/{content_id}/save', status_code=status.HTTP_204_NO_CONTENT)
def unsave_content(content_id: str, user: CurrentUser, service: Service) -> None:
    service.unsave(user, content_id)


@router.post('/content/{content_id}/like', status_code=status.HTTP_204_NO_CONTENT)
def like_content(content_id: str, user: CurrentUser, service: Service) -> None:
    service.like(user, content_id)


@router.delete('/content/{content_id}/like', status_code=status.HTTP_204_NO_CONTENT)
def unlike_content(content_id: str, user: CurrentUser, service: Service) -> None:
    service.unlike(user, content_id)


@router.get('/me/saved', response_model=SavedListResponse)
def list_saved(
    user: CurrentUser,
    service: Service,
    limit: int = Query(50, ge=1, le=100),
    before: datetime | None = Query(None),
) -> SavedListResponse:
    items = service.list_saved(user, limit=limit, before=before)
    return SavedListResponse(items=[SavedItemSchema.from_domain(i) for i in items])


@router.post('/analytics/events', response_model=AnalyticsBatchResponse)
def record_analytics_events(
    body: AnalyticsBatchRequest, user: CurrentUser, service: Service
) -> AnalyticsBatchResponse:
    _analytics_limiter().check(f'analytics:{user.user_id}')
    accepted = service.record_events(user, [e.to_domain() for e in body.events])
    return AnalyticsBatchResponse(accepted=accepted)
