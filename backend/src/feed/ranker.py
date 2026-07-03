from __future__ import annotations

import math
from dataclasses import dataclass

from .models.domain import FeedCandidate, FeedContext

FRESHNESS_HALF_LIFE_DAYS = 3.0
ENGAGEMENT_SATURATION = 50  # likes+saves where the engagement signal ~saturates


@dataclass(frozen=True, slots=True)
class RankWeights:
    location: float = 0.25
    creator_affinity: float = 0.20
    watch_completion: float = 0.20
    engagement: float = 0.15
    event_conversion: float = 0.10
    freshness: float = 0.10


class FeedRanker:
    """Deterministic weighted scorer over feed candidates."""

    def __init__(self, weights: RankWeights | None = None) -> None:
        self._weights = weights or RankWeights()

    def rank(self, candidates: list[FeedCandidate], ctx: FeedContext) -> list[FeedCandidate]:
        scored = [(self.score(c, ctx), c) for c in candidates]
        scored.sort(key=lambda pair: (-pair[0], pair[1].content_id))
        return [c for _, c in scored]

    def score(self, candidate: FeedCandidate, ctx: FeedContext) -> float:
        w = self._weights
        return (
            w.location * self._location(candidate, ctx)
            + w.creator_affinity * self._affinity(candidate, ctx)
            + w.watch_completion * self._completion(candidate)
            + w.engagement * self._engagement(candidate)
            + w.event_conversion * self._event_conversion(candidate)
            + w.freshness * self._freshness(candidate, ctx)
        )

    @staticmethod
    def _location(candidate: FeedCandidate, ctx: FeedContext) -> float:
        if candidate.h3_index is not None:
            if candidate.h3_index in ctx.near_cells:
                return 1.0
            if candidate.h3_index in ctx.h3_cells:
                return 0.6
        if candidate.place_id is not None and candidate.place_id == ctx.place_id:
            return 0.3
        return 0.0

    @staticmethod
    def _affinity(candidate: FeedCandidate, ctx: FeedContext) -> float:
        return 1.0 if candidate.creator_id in ctx.followed_creator_ids else 0.0

    @staticmethod
    def _completion(candidate: FeedCandidate) -> float:
        if candidate.view_count <= 0:
            return 0.0
        return min(candidate.completion_count / candidate.view_count, 1.0)

    @staticmethod
    def _engagement(candidate: FeedCandidate) -> float:
        total = candidate.like_count + candidate.save_count
        if total <= 0:
            return 0.0
        return min(math.log1p(total) / math.log1p(ENGAGEMENT_SATURATION), 1.0)

    @staticmethod
    def _event_conversion(candidate: FeedCandidate) -> float:
        if candidate.event_id is None:
            return 0.0
        if candidate.view_count <= 0:
            return 0.3  # linked event with no data yet still gets a nudge
        return 0.3 + 0.7 * min(candidate.ticket_click_count / candidate.view_count, 1.0)

    @staticmethod
    def _freshness(candidate: FeedCandidate, ctx: FeedContext) -> float:
        age_days = max((ctx.now - candidate.published_at).total_seconds() / 86_400, 0.0)
        return math.exp(-math.log(2) * age_days / FRESHNESS_HALF_LIFE_DAYS)
