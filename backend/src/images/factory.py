"""Wires the image service and adapts the owning events repository to a narrow port."""

from functools import lru_cache

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .models.domain import ImageAsset
from .ports import PosterEvent
from .service import PosterService
from .storage import PosterUnavailableError, SupabasePosterStorage


class RepositoryPosterEvents:
    def __init__(self, repository, *, session: Session | None = None) -> None:
        self._repository = repository
        self._session = session

    def get(self, event_id: str) -> PosterEvent | None:
        event = (
            self._repository.get(event_id) if self._session is None
            else self._repository.get_in_session(self._session, event_id)
        )
        if event is None:
            return None
        return PosterEvent(event.id, event.venue_id, event.poster_asset_id, event.poster_revision)

    def referenced(self, asset_id: str) -> bool:
        if self._session is None:
            return self._repository.poster_referenced(asset_id)
        return self._repository.poster_referenced_in_session(self._session, asset_id)

    def swap(
        self, event_id: str, owner_id: str, expected_revision: int,
        asset: ImageAsset | None, url: str | None,
    ) -> None:
        try:
            arguments = (
                event_id, owner_id, expected_revision, asset.id if asset else None,
                url, asset.width if asset else None, asset.height if asset else None,
            )
            if self._session is None:
                self._repository.swap_poster(*arguments)
            else:
                self._repository.swap_poster_in_session(self._session, *arguments)
        except SQLAlchemyError as exc:
            raise PosterUnavailableError('poster reference update failed; refresh and retry') from exc


@lru_cache(maxsize=1)
def get_service() -> PosterService:
    from events.factory import build_repository
    from shared.config import settings
    from shared.database import get_sessionmaker

    from .repository import SqlImageRepository

    events = build_repository()
    repository = SqlImageRepository(
        get_sessionmaker(), lambda session: RepositoryPosterEvents(events, session=session),
    ) if settings.database_url else None
    storage = SupabasePosterStorage(
        settings.supabase_url, settings.supabase_service_role_key,
    ) if settings.supabase_url and settings.supabase_service_role_key else None
    return PosterService(
        repository, storage, RepositoryPosterEvents(events),
        enabled=settings.gig_posters_enabled,
    )
