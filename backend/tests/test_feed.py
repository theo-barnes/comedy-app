from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Sequence

import pytest

from feed.models.domain import ComedianSummary, FeedCandidate, FeedContext, FeedItem
from feed.ranker import FeedRanker, RankWeights
from feed.service import FeedService, FeedSources
from feed.sources import FollowedCreatorsSource, NearbyContentSource, TrendingSource
from shared.cache import MemoryCache

NOW = datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc)


def _candidate(content_id: str, **overrides) -> FeedCandidate:
    values = dict(
        content_id=content_id,
        creator_id=f'creator-{content_id}',
        content_type='video_clip',
        title=content_id,
        published_at=NOW - timedelta(hours=1),
    )
    values.update(overrides)
    return FeedCandidate(**values)


def _ctx(**overrides) -> FeedContext:
    values = dict(
        user_id='user-1',
        latitude=51.5,
        longitude=-0.1,
        h3_cells=('cell-near', 'cell-mid'),
        near_cells=('cell-near',),
        place_id='place-1',
        now=NOW,
    )
    values.update(overrides)
    return FeedContext(**values)


class FakeFeedRepository:
    def __init__(self) -> None:
        self.by_creators: list[FeedCandidate] = []
        self.nearby: list[FeedCandidate] = []
        self.trending: list[FeedCandidate] = []
        self.followed: tuple[str, ...] = ()
        self.blocked: tuple[str, ...] = ()
        self.comedians: list[ComedianSummary] = []
        self.venues: dict[str, str] = {}

    def candidates_by_creators(self, creator_ids: Sequence[str], *, limit: int):
        return [c for c in self.by_creators if c.creator_id in creator_ids][:limit]

    def candidates_nearby(self, h3_cells: Sequence[str], place_id, *, limit: int):  # noqa: ANN001
        return self.nearby[:limit]

    def candidates_trending(self, *, since, limit: int):  # noqa: ANN001
        return self.trending[:limit]

    def followed_creator_ids(self, user_id: str) -> tuple[str, ...]:
        return self.followed

    def blocked_user_ids(self, user_id: str) -> tuple[str, ...]:
        return self.blocked

    def hydrate(self, content_ids: Sequence[str], viewer_id: str) -> list[FeedItem]:
        return [
            FeedItem(
                content_id=cid,
                content_type='video_clip',
                title=cid,
                creator_id=f'creator-{cid}',
                creator_name=f'Creator {cid}',
                published_at=NOW,
            )
            for cid in content_ids
        ]

    def recent_comedians(self, *, limit: int) -> list[ComedianSummary]:
        return self.comedians[:limit]

    def venue_names(self, venue_ids: Sequence[str]) -> dict[str, str]:
        return {vid: self.venues.get(vid, 'Unknown venue') for vid in venue_ids}


class FakePlaceResolver:
    def resolve_city(self, lat: float, lng: float):  # noqa: ANN201
        return None


class FakeEventsPort:
    def __init__(self, events: list | None = None) -> None:
        self.events = events or []

    def list_nearby(self, lat, lng, *, radius_meters, limit):  # noqa: ANN001, ANN201
        return self.events[:limit]


def _service(repo: FakeFeedRepository) -> FeedService:
    return FeedService(
        repository=repo,
        sources=FeedSources(
            followed=FollowedCreatorsSource(repo),
            nearby=NearbyContentSource(repo),
            trending=TrendingSource(repo),
        ),
        ranker=FeedRanker(),
        cache=MemoryCache(),
        place_resolver=FakePlaceResolver(),
        events=FakeEventsPort(),
        venue_names=repo,
        page_size=2,
        cache_ttl_seconds=300,
    )


# ---------------------------------------------------------------- ranker


def test_ranker_is_deterministic() -> None:
    candidates = [
        _candidate('a', h3_index='cell-near'),
        _candidate('b', like_count=40, save_count=10),
        _candidate('c', published_at=NOW - timedelta(days=30)),
    ]
    ctx = _ctx()
    first = FeedRanker().rank(list(candidates), ctx)
    second = FeedRanker().rank(list(reversed(candidates)), ctx)
    assert [c.content_id for c in first] == [c.content_id for c in second]


def test_ranker_prefers_nearby_fresh_content() -> None:
    near = _candidate('near', h3_index='cell-near')
    far_old = _candidate('far-old', published_at=NOW - timedelta(days=30))
    ranked = FeedRanker().rank([far_old, near], _ctx())
    assert ranked[0].content_id == 'near'


def test_ranker_followed_creator_boost() -> None:
    followed = _candidate('followed', creator_id='creator-f')
    other = _candidate('other')
    ctx = _ctx(followed_creator_ids=('creator-f',))
    ranked = FeedRanker().rank([other, followed], ctx)
    assert ranked[0].content_id == 'followed'


def test_ranker_completion_signal() -> None:
    watched = _candidate('watched', view_count=100, completion_count=90)
    skipped = _candidate('skipped', view_count=100, completion_count=5)
    ranked = FeedRanker().rank([skipped, watched], _ctx())
    assert ranked[0].content_id == 'watched'


def test_custom_weights_change_order() -> None:
    near = _candidate('near', h3_index='cell-near')
    loved = _candidate('loved', like_count=50)
    ctx = _ctx()
    location_heavy = FeedRanker(RankWeights(location=1.0, engagement=0.0))
    engagement_heavy = FeedRanker(RankWeights(location=0.0, engagement=1.0))
    assert location_heavy.rank([loved, near], ctx)[0].content_id == 'near'
    assert engagement_heavy.rank([near, loved], ctx)[0].content_id == 'loved'


# ---------------------------------------------------------------- video feed


def test_feed_videos_paginates_with_cursor() -> None:
    repo = FakeFeedRepository()
    repo.trending = [_candidate(f'c{i}') for i in range(5)]
    service = _service(repo)

    page1 = service.feed_videos('user-1')
    assert len(page1.items) == 2
    assert page1.next_cursor is not None

    page2 = service.feed_videos('user-1', cursor=page1.next_cursor)
    assert len(page2.items) == 2
    assert {i.content_id for i in page1.items}.isdisjoint(
        {i.content_id for i in page2.items}
    )

    page3 = service.feed_videos('user-1', cursor=page2.next_cursor)
    assert len(page3.items) == 1
    assert page3.next_cursor is None


def test_feed_videos_uses_cached_snapshot() -> None:
    repo = FakeFeedRepository()
    repo.trending = [_candidate('c1'), _candidate('c2'), _candidate('c3')]
    service = _service(repo)

    first = service.feed_videos('user-1')
    repo.trending = []  # snapshot must survive source changes
    second = service.feed_videos('user-1')
    assert [i.content_id for i in first.items] == [i.content_id for i in second.items]


def test_feed_videos_excludes_blocked_creators() -> None:
    repo = FakeFeedRepository()
    repo.blocked = ('creator-bad',)
    repo.trending = [
        _candidate('bad', creator_id='creator-bad'),
        _candidate('good'),
    ]
    service = _service(repo)
    page = service.feed_videos('user-1')
    assert [i.content_id for i in page.items] == ['good']


def test_feed_videos_only_video_clips() -> None:
    repo = FakeFeedRepository()
    repo.trending = [
        _candidate('clip'),
        _candidate('poster', content_type='image'),
    ]
    service = _service(repo)
    page = service.feed_videos('user-1')
    assert [i.content_id for i in page.items] == ['clip']


def test_invalid_cursor_rejected() -> None:
    from shared.errors import ValidationFailedError

    service = _service(FakeFeedRepository())
    with pytest.raises(ValidationFailedError):
        service.feed_videos('user-1', cursor='not-a-cursor')


def test_expired_snapshot_cursor_requires_refresh() -> None:
    from shared.errors import GoneError

    repo = FakeFeedRepository()
    repo.trending = [_candidate('c1'), _candidate('c2'), _candidate('c3')]
    service = _service(repo)
    first = service.feed_videos('user-1')
    assert first.next_cursor is not None
    service._cache = MemoryCache()
    with pytest.raises(GoneError):
        service.feed_videos('user-1', cursor=first.next_cursor)


# ---------------------------------------------------------------- home feed


def test_home_feed_sections() -> None:
    repo = FakeFeedRepository()
    repo.followed = ('creator-f',)
    repo.by_creators = [_candidate('followed-clip', creator_id='creator-f')]
    repo.trending = [_candidate('hot-clip')]
    repo.comedians = [ComedianSummary(user_id='comedian-1', stage_name='Newcomer')]
    service = _service(repo)

    home = service.home_feed('user-1', lat=51.5, lng=-0.1)
    assert [i.content_id for i in home.trending_clips] == ['hot-clip']
    assert [i.content_id for i in home.followed_creators] == ['followed-clip']
    assert home.new_comedians[0].stage_name == 'Newcomer'
    assert home.nearby_events == ()
