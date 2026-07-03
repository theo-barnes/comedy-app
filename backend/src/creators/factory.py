from __future__ import annotations

from functools import lru_cache

from .repository import CreatorRepository
from .service import CreatorService


class UnavailableCreatorRepository:
    """Used when no database is configured; raises on any access."""

    def _fail(self) -> None:
        raise RuntimeError('creator repository requires DISCOVERY_DATABASE_URL')

    def get_comedian(self, user_id: str):  # noqa: ANN201
        self._fail()

    def upsert_comedian(self, profile):  # noqa: ANN001, ANN201
        self._fail()

    def get_venue(self, user_id: str):  # noqa: ANN201
        self._fail()

    def upsert_venue(self, profile):  # noqa: ANN001, ANN201
        self._fail()

    def get_creator(self, user_id: str):  # noqa: ANN201
        self._fail()


def build_repository() -> CreatorRepository:
    from shared.config import settings

    if not settings.database_url:
        return UnavailableCreatorRepository()

    from shared.database import get_sessionmaker

    from .repository import SqlCreatorRepository

    return SqlCreatorRepository(session_factory=get_sessionmaker())


@lru_cache(maxsize=1)
def get_service() -> CreatorService:
    return CreatorService(repository=build_repository())
