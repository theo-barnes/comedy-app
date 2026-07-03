from __future__ import annotations

from datetime import timedelta
from typing import Protocol

from .models.domain import FeedCandidate, FeedContext
from .repository import FeedRepository


class CandidateSource(Protocol):
    """Produces feed candidates for one signal (followed, nearby, trending)."""

    def collect(self, ctx: FeedContext) -> list[FeedCandidate]: ...


class FollowedCreatorsSource:
    def __init__(self, repository: FeedRepository) -> None:
        self._repository = repository

    def collect(self, ctx: FeedContext) -> list[FeedCandidate]:
        if not ctx.followed_creator_ids:
            return []
        return self._repository.candidates_by_creators(
            ctx.followed_creator_ids, limit=ctx.candidate_limit
        )


class NearbyContentSource:
    def __init__(self, repository: FeedRepository) -> None:
        self._repository = repository

    def collect(self, ctx: FeedContext) -> list[FeedCandidate]:
        if not ctx.h3_cells and ctx.place_id is None:
            return []
        return self._repository.candidates_nearby(
            ctx.h3_cells, ctx.place_id, limit=ctx.candidate_limit
        )


class TrendingSource:
    def __init__(self, repository: FeedRepository, *, window_days: int = 7) -> None:
        self._repository = repository
        self._window = timedelta(days=window_days)

    def collect(self, ctx: FeedContext) -> list[FeedCandidate]:
        return self._repository.candidates_trending(
            since=ctx.now - self._window, limit=ctx.candidate_limit
        )
