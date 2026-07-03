from __future__ import annotations

from functools import lru_cache

from .repository import EventRepository
from .service import ComedianLookup, EventService


class RepositoryComedianLookup:
    def __init__(self, creators_repository) -> None:  # noqa: ANN001
        self._creators = creators_repository

    def comedian_exists(self, comedian_id: str) -> bool:
        return self._creators.get_comedian(comedian_id) is not None


class UnavailableEventRepository:
    """Used when no database is configured; raises on any access."""

    def __getattr__(self, name: str):  # noqa: ANN204
        def _fail(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
            raise RuntimeError('event repository requires DISCOVERY_DATABASE_URL')

        return _fail


def build_repository() -> EventRepository:
    from shared.config import settings

    if not settings.database_url:
        return UnavailableEventRepository()

    from shared.database import get_sessionmaker

    from .repository import SqlEventRepository

    return SqlEventRepository(session_factory=get_sessionmaker())


@lru_cache(maxsize=1)
def get_service() -> EventService:
    from creators.factory import build_repository as build_creators_repository
    from location.factory import build_repository as build_place_repository
    from shared.config import settings

    lookup: ComedianLookup = RepositoryComedianLookup(build_creators_repository())
    return EventService(
        repository=build_repository(),
        comedians=lookup,
        place_resolver=build_place_repository(),
        h3_resolution=settings.content_h3_resolution,
    )
