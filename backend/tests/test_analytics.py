from __future__ import annotations

import json
from datetime import date, datetime, timedelta, timezone
from typing import Sequence

import pytest

from analytics.models.domain import (
    AudiencePlace,
    ContentStatsDaily,
    CreatorStatsDaily,
    EventRecord,
)
from analytics.service import AnalyticsService
from shared.auth.models import AuthenticatedUser
from shared.cache import MemoryCache
from shared.errors import NotFoundError, PermissionDeniedError
from workers.rollup import compute_content_stats, compute_creator_stats, run_rollup
from workers.trending import TRENDING_CACHE_KEY, compute_trending_scores, run_trending

NOW = datetime(2026, 7, 2, 12, 0, tzinfo=timezone.utc)
TODAY = NOW.date()


def _event(event_type: str, *, content_id: str | None = 'content-1', hours_ago: float = 1,
           metadata: dict | None = None) -> EventRecord:
    return EventRecord(
        event_type=event_type,
        occurred_at=NOW - timedelta(hours=hours_ago),
        content_id=content_id,
        metadata=metadata,
    )


class FakeAnalyticsRepository:
    def __init__(self) -> None:
        self.events: list[EventRecord] = []
        self.creators: dict[str, str] = {}
        self.follows: list[tuple[str, datetime]] = []
        self.content_stats: dict[tuple[str, date], ContentStatsDaily] = {}
        self.creator_stats: dict[tuple[str, date], CreatorStatsDaily] = {}
        self.creator_contents: dict[str, list[str]] = {}
        self.places: list[AudiencePlace] = []

    def events_between(self, start: datetime, end: datetime) -> list[EventRecord]:
        return [e for e in self.events if start <= e.occurred_at < end]

    def content_creators(self, content_ids: Sequence[str]) -> dict[str, str]:
        return {cid: self.creators[cid] for cid in content_ids if cid in self.creators}

    def follows_created_between(self, start: datetime, end: datetime) -> list[str]:
        return [cid for cid, at in self.follows if start <= at < end]

    def upsert_content_stats(self, stats: Sequence[ContentStatsDaily]) -> None:
        for s in stats:
            self.content_stats[(s.content_id, s.date)] = s

    def upsert_creator_stats(self, stats: Sequence[CreatorStatsDaily]) -> None:
        for s in stats:
            self.creator_stats[(s.creator_id, s.date)] = s

    def creator_content_ids(self, creator_id: str) -> list[str]:
        return self.creator_contents.get(creator_id, [])

    def content_stats_range(
        self, content_ids: Sequence[str], start: date, end: date
    ) -> list[ContentStatsDaily]:
        return [
            s
            for (cid, day), s in self.content_stats.items()
            if cid in content_ids and start <= day <= end
        ]

    def creator_stats_range(
        self, creator_id: str, start: date, end: date
    ) -> list[CreatorStatsDaily]:
        return [
            s
            for (cid, day), s in self.creator_stats.items()
            if cid == creator_id and start <= day <= end
        ]

    def top_places_for_creator(
        self, creator_id: str, *, since: datetime, limit: int
    ) -> list[AudiencePlace]:
        return self.places[:limit]


# ---------------------------------------------------------------- rollup


def test_compute_content_stats_counts_by_day() -> None:
    events = [
        _event('video_viewed', metadata={'watchSeconds': 12.5}),
        _event('video_viewed'),
        _event('video_completed'),
        _event('ticket_clicked'),
        _event('video_viewed', content_id='content-2'),
        _event('profile_viewed', content_id=None),
    ]
    stats = {s.content_id: s for s in compute_content_stats(events)}
    assert stats['content-1'].views == 2
    assert stats['content-1'].completions == 1
    assert stats['content-1'].ticket_clicks == 1
    assert stats['content-1'].watch_seconds == pytest.approx(12.5)
    assert stats['content-2'].views == 1


def test_compute_creator_stats() -> None:
    events = [
        _event('video_viewed'),
        _event('profile_viewed', content_id=None, metadata={'creatorId': 'creator-a'}),
    ]
    stats = compute_creator_stats(
        events,
        {'content-1': 'creator-a'},
        ['creator-a', 'creator-a', 'creator-b'],
        day_of_follows=TODAY,
    )
    by_creator = {s.creator_id: s for s in stats}
    assert by_creator['creator-a'].total_views == 1
    assert by_creator['creator-a'].profile_views == 1
    assert by_creator['creator-a'].followers_gained == 2
    assert by_creator['creator-b'].followers_gained == 1


def test_run_rollup_is_idempotent() -> None:
    repo = FakeAnalyticsRepository()
    repo.events = [_event('video_viewed')]
    repo.creators = {'content-1': 'creator-a'}

    run_rollup(repo, now=NOW)
    first = dict(repo.content_stats)
    run_rollup(repo, now=NOW)
    assert repo.content_stats == first
    assert repo.content_stats[('content-1', TODAY)].views == 1


# ---------------------------------------------------------------- trending


def test_trending_decay_orders_recent_higher() -> None:
    events = [
        _event('video_viewed', content_id='old', hours_ago=48),
        _event('video_viewed', content_id='new', hours_ago=1),
    ]
    ranked = compute_trending_scores(events, now=NOW)
    assert [cid for cid, _ in ranked] == ['new', 'old']


def test_trending_weights_completions_over_views() -> None:
    events = [
        _event('video_viewed', content_id='viewed'),
        _event('video_completed', content_id='completed'),
    ]
    ranked = compute_trending_scores(events, now=NOW)
    assert ranked[0][0] == 'completed'


def test_run_trending_writes_cache() -> None:
    repo = FakeAnalyticsRepository()
    repo.events = [_event('video_viewed')]
    cache = MemoryCache()
    count = run_trending(repo, cache, now=NOW)
    assert count == 1
    cached = json.loads(cache.get(TRENDING_CACHE_KEY))
    assert cached[0][0] == 'content-1'


# ---------------------------------------------------------------- service


def _creator(user_id: str = 'creator-a') -> AuthenticatedUser:
    return AuthenticatedUser(user_id=user_id, email=None, role='comedian')


def test_overview_aggregates_own_content() -> None:
    repo = FakeAnalyticsRepository()
    repo.creator_contents['creator-a'] = ['content-1']
    repo.content_stats[('content-1', TODAY)] = ContentStatsDaily(
        content_id='content-1', date=TODAY, views=10, completions=4
    )
    repo.creator_stats[('creator-a', TODAY)] = CreatorStatsDaily(
        creator_id='creator-a', date=TODAY, followers_gained=3
    )
    service = AnalyticsService(repo)
    content_stats, creator_stats = service.overview(_creator())
    assert content_stats[0].views == 10
    assert creator_stats[0].followers_gained == 3


def test_content_stats_ownership_enforced() -> None:
    repo = FakeAnalyticsRepository()
    repo.creators = {'content-1': 'creator-a'}
    service = AnalyticsService(repo)
    with pytest.raises(PermissionDeniedError):
        service.content_stats(_creator('creator-b'), 'content-1')
    with pytest.raises(NotFoundError):
        service.content_stats(_creator(), 'ghost')
    assert service.content_stats(_creator(), 'content-1') == []


def test_audience_returns_places() -> None:
    repo = FakeAnalyticsRepository()
    repo.places = [AudiencePlace(place_id='place-1', name='London', views=42)]
    service = AnalyticsService(repo)
    places = service.audience(_creator())
    assert places[0].name == 'London'
