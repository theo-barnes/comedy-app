from __future__ import annotations

from functools import lru_cache

from .repository import EngagementRepository
from .service import ContentLookup, EngagementService


class RepositoryContentLookup:
    def __init__(self, content_repository) -> None:  # noqa: ANN001
        self._content = content_repository

    def content_is_engageable(self, content_id: str) -> bool:
        from content.models.domain import ContentStatus

        content = self._content.get_content(content_id)
        return content is not None and content.status is ContentStatus.PUBLISHED


class UnavailableEngagementRepository:
    """Used when no database is configured; raises on any access."""

    def __getattr__(self, name: str):  # noqa: ANN204
        def _fail(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
            raise RuntimeError('engagement repository requires DISCOVERY_DATABASE_URL')

        return _fail


def build_repository() -> EngagementRepository:
    from shared.config import settings

    if not settings.database_url:
        return UnavailableEngagementRepository()

    from shared.database import get_sessionmaker

    from .repository import SqlEngagementRepository

    return SqlEngagementRepository(session_factory=get_sessionmaker())


@lru_cache(maxsize=1)
def get_service() -> EngagementService:
    from content.factory import build_repository as build_content_repository

    lookup: ContentLookup = RepositoryContentLookup(build_content_repository())
    return EngagementService(repository=build_repository(), content=lookup)
