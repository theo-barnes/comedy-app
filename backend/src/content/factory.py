from __future__ import annotations

from functools import lru_cache

from .repository import ContentRepository
from .service import ContentService


class UnavailableContentRepository:
    """Used when no database is configured; raises on any access."""

    def __getattr__(self, name: str):  # noqa: ANN204
        def _fail(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
            raise RuntimeError('content repository requires DISCOVERY_DATABASE_URL')

        return _fail


def build_repository() -> ContentRepository:
    from shared.config import settings

    if not settings.database_url:
        return UnavailableContentRepository()

    from shared.database import get_sessionmaker

    from .repository import SqlContentRepository

    return SqlContentRepository(session_factory=get_sessionmaker())


@lru_cache(maxsize=1)
def get_service() -> ContentService:
    from location.factory import build_repository as build_place_repository
    from media.factory import get_media_provider
    from shared.config import settings

    return ContentService(
        repository=build_repository(),
        media_provider=get_media_provider(),
        place_resolver=build_place_repository(),
        h3_resolution=settings.content_h3_resolution,
        max_video_duration_seconds=settings.max_video_duration_seconds,
    )
