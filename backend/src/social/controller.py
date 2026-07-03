from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from shared.auth import AuthenticatedUser, get_current_user
from shared.ratelimit import RateLimiter

from .factory import get_service
from .models.domain import ReportTargetType
from .schemas import (
    BlockedResponse,
    CreateReportRequest,
    FollowingResponse,
    FollowSchema,
    ReportSchema,
)
from .service import SocialService

router = APIRouter(tags=['social'])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Service = Annotated[SocialService, Depends(get_service)]


@lru_cache(maxsize=1)
def _report_limiter() -> RateLimiter:
    from shared.cache import create_cache
    from shared.config import settings

    return RateLimiter(create_cache(settings.redis_url), limit=10, window_seconds=3600)


@router.post('/follows/{creator_id}', status_code=status.HTTP_204_NO_CONTENT)
def follow(creator_id: str, user: CurrentUser, service: Service) -> None:
    service.follow(user, creator_id)


@router.delete('/follows/{creator_id}', status_code=status.HTTP_204_NO_CONTENT)
def unfollow(creator_id: str, user: CurrentUser, service: Service) -> None:
    service.unfollow(user, creator_id)


@router.get('/me/following', response_model=FollowingResponse)
def list_following(
    user: CurrentUser,
    service: Service,
    limit: int = Query(50, ge=1, le=100),
    before: datetime | None = Query(None),
) -> FollowingResponse:
    follows = service.list_following(user, limit=limit, before=before)
    return FollowingResponse(items=[FollowSchema.from_domain(f) for f in follows])


@router.post('/blocks/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
def block(user_id: str, user: CurrentUser, service: Service) -> None:
    service.block(user, user_id)


@router.delete('/blocks/{user_id}', status_code=status.HTTP_204_NO_CONTENT)
def unblock(user_id: str, user: CurrentUser, service: Service) -> None:
    service.unblock(user, user_id)


@router.get('/me/blocks', response_model=BlockedResponse)
def list_blocks(user: CurrentUser, service: Service) -> BlockedResponse:
    return BlockedResponse(userIds=service.list_blocked(user))


@router.post('/reports', response_model=ReportSchema, status_code=status.HTTP_201_CREATED)
def create_report(body: CreateReportRequest, user: CurrentUser, service: Service) -> ReportSchema:
    _report_limiter().check(f'reports:{user.user_id}')
    report = service.report(
        user,
        target_type=ReportTargetType(body.targetType),
        target_id=body.targetId,
        reason=body.reason,
        details=body.details,
    )
    return ReportSchema.from_domain(report)
