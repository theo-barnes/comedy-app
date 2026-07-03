from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from shared.auth import AuthenticatedUser, require_role

from .factory import get_service
from .schemas import (
    AudiencePlaceSchema,
    AudienceResponse,
    ContentStatsDaySchema,
    ContentStatsResponse,
    CreatorStatsDaySchema,
    OverviewResponse,
    OverviewTotals,
)
from .service import AnalyticsService

router = APIRouter(tags=['creator-analytics'])

CreatorUser = Annotated[AuthenticatedUser, Depends(require_role('comedian', 'venue'))]
Service = Annotated[AnalyticsService, Depends(get_service)]


@router.get('/creator/analytics/overview', response_model=OverviewResponse)
def analytics_overview(
    user: CreatorUser,
    service: Service,
    days: int = Query(30, ge=1, le=90),
) -> OverviewResponse:
    content_stats, creator_stats = service.overview(user, days=days)
    totals = OverviewTotals(
        views=sum(s.views for s in content_stats),
        completions=sum(s.completions for s in content_stats),
        shares=sum(s.shares for s in content_stats),
        ticketClicks=sum(s.ticket_clicks for s in content_stats),
        watchSeconds=sum(s.watch_seconds for s in content_stats),
        followersGained=sum(s.followers_gained for s in creator_stats),
        profileViews=sum(s.profile_views for s in creator_stats),
    )
    return OverviewResponse(
        totals=totals,
        contentDaily=[ContentStatsDaySchema.from_domain(s) for s in content_stats],
        creatorDaily=[CreatorStatsDaySchema.from_domain(s) for s in creator_stats],
    )


@router.get('/creator/analytics/content/{content_id}', response_model=ContentStatsResponse)
def analytics_content(
    content_id: str,
    user: CreatorUser,
    service: Service,
    days: int = Query(30, ge=1, le=90),
) -> ContentStatsResponse:
    stats = service.content_stats(user, content_id, days=days)
    return ContentStatsResponse(days=[ContentStatsDaySchema.from_domain(s) for s in stats])


@router.get('/creator/analytics/audience', response_model=AudienceResponse)
def analytics_audience(
    user: CreatorUser,
    service: Service,
    days: int = Query(30, ge=1, le=90),
    limit: int = Query(10, ge=1, le=25),
) -> AudienceResponse:
    places = service.audience(user, days=days, limit=limit)
    return AudienceResponse(topPlaces=[AudiencePlaceSchema.from_domain(p) for p in places])
