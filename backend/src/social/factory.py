from __future__ import annotations

from functools import lru_cache

from .repository import SocialRepository
from .service import CreatorLookup, SocialService


class RepositoryCreatorLookup:
    """Adapts the creators repository to the CreatorLookup protocol."""

    def __init__(self, creators_repository) -> None:  # noqa: ANN001
        self._creators = creators_repository

    def creator_exists(self, creator_id: str) -> bool:
        return self._creators.get_creator(creator_id) is not None


class UnavailableSocialRepository:
    """Used when no database is configured; raises on any access."""

    def __getattr__(self, name: str):  # noqa: ANN204
        def _fail(*args, **kwargs):  # noqa: ANN002, ANN003, ANN202
            raise RuntimeError('social repository requires DISCOVERY_DATABASE_URL')

        return _fail


def build_repository() -> SocialRepository:
    from shared.config import settings

    if not settings.database_url:
        return UnavailableSocialRepository()

    from shared.database import get_sessionmaker

    from .repository import SqlSocialRepository

    return SqlSocialRepository(session_factory=get_sessionmaker())


@lru_cache(maxsize=1)
def get_service() -> SocialService:
    from creators.factory import build_repository as build_creators_repository

    lookup: CreatorLookup = RepositoryCreatorLookup(build_creators_repository())
    return SocialService(repository=build_repository(), creators=lookup)
