from __future__ import annotations

from functools import lru_cache

from .ranker import FeedRanker, RankWeights
from .repository import FeedRepository
from .service import FeedService, FeedSources
from .sources import FollowedCreatorsSource, NearbyContentSource, TrendingSource


class UnavailableFeedRepository:
    """Used when no database is configured; raises on any access."""

    def __getattr__(self, name: str):  # noqa: ANN204
        def _fail(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
            raise RuntimeError('feed repository requires DISCOVERY_DATABASE_URL')

        return _fail


def build_repository() -> FeedRepository:
    from shared.config import settings

    if not settings.database_url:
        return UnavailableFeedRepository()

    from shared.database import get_sessionmaker

    from .repository import SqlFeedRepository

    return SqlFeedRepository(session_factory=get_sessionmaker())


@lru_cache(maxsize=1)
def get_service() -> FeedService:
    from events.factory import get_service as get_events_service
    from location.factory import build_repository as build_place_repository
    from shared.cache import create_cache
    from shared.config import settings

    repository = build_repository()
    return FeedService(
        repository=repository,
        sources=FeedSources(
            followed=FollowedCreatorsSource(repository),
            nearby=NearbyContentSource(repository),
            trending=TrendingSource(repository),
        ),
        ranker=FeedRanker(
            RankWeights(
                location=settings.feed_weight_location,
                creator_affinity=settings.feed_weight_creator_affinity,
                watch_completion=settings.feed_weight_watch_completion,
                engagement=settings.feed_weight_engagement,
                event_conversion=settings.feed_weight_event_conversion,
                freshness=settings.feed_weight_freshness,
            )
        ),
        cache=create_cache(settings.redis_url),
        place_resolver=build_place_repository(),
        events=get_events_service(),
        venue_names=repository,
        page_size=settings.feed_page_size,
        cache_ttl_seconds=settings.feed_cache_ttl_seconds,
        candidate_limit=settings.feed_candidate_limit,
        h3_resolution=settings.content_h3_resolution,
        h3_ring_k=settings.feed_h3_ring_k,
        anchor_resolution=settings.cache_h3_resolution,
    )
