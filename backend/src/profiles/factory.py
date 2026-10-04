"""Wires the public-profile service from configured storage."""

from __future__ import annotations

from functools import lru_cache

from .repository import PublicProfileRepository
from .service import PublicProfileService


class UnavailablePublicProfileRepository:
    """Used when no database is configured."""

    def get_public_profile(self, user_id: str):  # noqa: ANN201
        raise RuntimeError('public profile repository requires DISCOVERY_DATABASE_URL')


def build_repository() -> PublicProfileRepository:
    from shared.config import settings

    if not settings.database_url:
        return UnavailablePublicProfileRepository()

    from shared.database import get_sessionmaker

    from .repository import SqlPublicProfileRepository

    return SqlPublicProfileRepository(session_factory=get_sessionmaker())


@lru_cache(maxsize=1)
def get_service() -> PublicProfileService:
    return PublicProfileService(repository=build_repository())