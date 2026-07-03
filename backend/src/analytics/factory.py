from __future__ import annotations

from functools import lru_cache

from .repository import AnalyticsRepository
from .service import AnalyticsService


class UnavailableAnalyticsRepository:
    """Used when no database is configured; raises on any access."""

    def __getattr__(self, name: str):  # noqa: ANN204
        def _fail(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
            raise RuntimeError('analytics repository requires DISCOVERY_DATABASE_URL')

        return _fail


def build_repository() -> AnalyticsRepository:
    from shared.config import settings

    if not settings.database_url:
        return UnavailableAnalyticsRepository()

    from shared.database import get_sessionmaker

    from .repository import SqlAnalyticsRepository

    return SqlAnalyticsRepository(session_factory=get_sessionmaker())


@lru_cache(maxsize=1)
def get_service() -> AnalyticsService:
    return AnalyticsService(repository=build_repository())
