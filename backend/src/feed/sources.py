"""The three CandidateSource implementations merged by FeedService into a home/video feed."""

from __future__ import annotations

from datetime import timedelta
from typing import Protocol

from shared.cache import CacheBackend

from .models.domain import FeedCandidate, FeedContext
from .repository import FeedRepository
from .trending_cache import read_trending_ids


class CandidateSource(Protocol):
    """Produces feed candidates for one signal (followed, nearby, trending)."""

    def collect(self, ctx: FeedContext) -> list[FeedCandidate]: ...


class RecentContentSource:
    """A bounded cold-start source so new public clips can receive their first views."""

    def __init__(self, repository: FeedRepository) -> None:
        self._repository = repository

    def collect(self, ctx: FeedContext) -> list[FeedCandidate]:
        return self._repository.candidates_recent(limit=ctx.candidate_limit)


class FollowedCreatorsSource:
    """Content from creators the viewer follows."""

    def __init__(self, repository: FeedRepository) -> None:
        self._repository = repository

    def collect(self, ctx: FeedContext) -> list[FeedCandidate]:
        if not ctx.followed_creator_ids:
            return []
        return self._repository.candidates_by_creators(
            ctx.followed_creator_ids, limit=ctx.candidate_limit
        )


class NearbyContentSource:
    """Content geographically close to the viewer (by H3 cell or resolved place)."""

    def __init__(self, repository: FeedRepository) -> None:
        self._repository = repository

    def collect(self, ctx: FeedContext) -> list[FeedCandidate]:
        if not ctx.h3_cells and ctx.place_id is None:
            return []
        return self._repository.candidates_nearby(
            ctx.h3_cells, ctx.place_id, limit=ctx.candidate_limit
        )


class TrendingSource:
    """Content ranked by the worker-computed, decay-weighted trending cache, falling back to
    an on-demand count-in-window DB query when that cache is cold or missing.
    """

    def __init__(
        self, repository: FeedRepository, cache: CacheBackend, *, window_days: int = 7
    ) -> None:
        self._repository = repository
        self._cache = cache
        self._window = timedelta(days=window_days)

    def collect(self, ctx: FeedContext) -> list[FeedCandidate]:
        ids = read_trending_ids(self._cache)
        if ids:
            return self._collect_from_cache(ids[: ctx.candidate_limit])
        return self._repository.candidates_trending(
            since=ctx.now - self._window, limit=ctx.candidate_limit
        )

    def _collect_from_cache(self, ranked_ids: list[str]) -> list[FeedCandidate]:
        candidates = {c.content_id: c for c in self._repository.candidates_by_ids(ranked_ids)}
        return [candidates[cid] for cid in ranked_ids if cid in candidates]
