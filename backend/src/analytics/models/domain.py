from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime


@dataclass(frozen=True, slots=True)
class ContentStatsDaily:
    content_id: str
    date: date
    views: int = 0
    completions: int = 0
    shares: int = 0
    ticket_clicks: int = 0
    watch_seconds: float = 0.0


@dataclass(frozen=True, slots=True)
class CreatorStatsDaily:
    creator_id: str
    date: date
    followers_gained: int = 0
    profile_views: int = 0
    total_views: int = 0


@dataclass(frozen=True, slots=True)
class EventRecord:
    """A raw engagement event as consumed by rollups."""

    event_type: str
    occurred_at: datetime
    content_id: str | None = None
    user_id: str | None = None
    metadata: dict | None = None


@dataclass(frozen=True, slots=True)
class AudiencePlace:
    place_id: str
    name: str | None
    views: int
