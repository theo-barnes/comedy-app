from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from .models.domain import AudiencePlace, ContentStatsDaily, CreatorStatsDaily


class ContentStatsDaySchema(BaseModel):
    contentId: str
    date: date
    views: int
    completions: int
    shares: int
    ticketClicks: int
    watchSeconds: float

    @staticmethod
    def from_domain(s: ContentStatsDaily) -> 'ContentStatsDaySchema':
        return ContentStatsDaySchema(
            contentId=s.content_id,
            date=s.date,
            views=s.views,
            completions=s.completions,
            shares=s.shares,
            ticketClicks=s.ticket_clicks,
            watchSeconds=s.watch_seconds,
        )


class CreatorStatsDaySchema(BaseModel):
    date: date
    followersGained: int
    profileViews: int
    totalViews: int

    @staticmethod
    def from_domain(s: CreatorStatsDaily) -> 'CreatorStatsDaySchema':
        return CreatorStatsDaySchema(
            date=s.date,
            followersGained=s.followers_gained,
            profileViews=s.profile_views,
            totalViews=s.total_views,
        )


class OverviewTotals(BaseModel):
    views: int = 0
    completions: int = 0
    shares: int = 0
    ticketClicks: int = 0
    watchSeconds: float = 0.0
    followersGained: int = 0
    profileViews: int = 0


class OverviewResponse(BaseModel):
    totals: OverviewTotals
    contentDaily: list[ContentStatsDaySchema] = Field(default_factory=list)
    creatorDaily: list[CreatorStatsDaySchema] = Field(default_factory=list)


class ContentStatsResponse(BaseModel):
    days: list[ContentStatsDaySchema] = Field(default_factory=list)


class AudiencePlaceSchema(BaseModel):
    placeId: str
    name: str | None = None
    views: int

    @staticmethod
    def from_domain(p: AudiencePlace) -> 'AudiencePlaceSchema':
        return AudiencePlaceSchema(placeId=p.place_id, name=p.name, views=p.views)


class AudienceResponse(BaseModel):
    topPlaces: list[AudiencePlaceSchema] = Field(default_factory=list)
