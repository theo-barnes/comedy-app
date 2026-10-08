"""Durable image intents and serialized per-asset operations, including cleanup."""

from contextlib import contextmanager
from dataclasses import asdict, fields
from datetime import datetime
from typing import Callable, ContextManager, Iterator, Protocol

from sqlalchemy import exists, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from .models.orm import ImageAssetRow
from .models.domain import ImageAsset
from .ports import ImageTransaction, PosterEvents
from .storage import PosterUnavailableError


class ImageRepository(Protocol):
    def create(self, asset: ImageAsset) -> None: ...
    def locked(self, asset_id: str) -> ContextManager[ImageTransaction]: ...
    def cleanup_candidates(self, before: datetime, limit: int) -> list[str]: ...


class SqlImageRepository:
    def __init__(
        self, session_factory: sessionmaker[Session],
        events_for_session: Callable[[Session], PosterEvents],
    ) -> None:
        self._sessions = session_factory
        self._events_for_session = events_for_session

    def create(self, asset: ImageAsset) -> None:
        try:
            with self._sessions() as session:
                session.add(ImageAssetRow(**asdict(asset)))
                session.commit()
        except SQLAlchemyError as exc:
            raise PosterUnavailableError('poster intent could not be recorded; retry') from exc

    @contextmanager
    def locked(self, asset_id: str) -> Iterator[ImageTransaction]:
        try:
            with self._sessions() as session:
                row = session.scalar(select(ImageAssetRow).where(
                    ImageAssetRow.id == asset_id,
                ).with_for_update())
                asset = ImageAsset(**{
                    field.name: getattr(row, field.name) for field in fields(ImageAsset)
                }) if row is not None else None
                yield ImageTransaction(asset, self._events_for_session(session))
                if asset is not None:
                    for field in ('status', 'touched_at', 'expires_at', 'output_type', 'width', 'height'):
                        setattr(row, field, getattr(asset, field))
                session.commit()
        except SQLAlchemyError as exc:
            raise PosterUnavailableError('poster state update failed; refresh and retry') from exc

    def cleanup_candidates(self, before: datetime, limit: int) -> list[str]:
        from events.models.orm import EventRow

        with self._sessions() as session:
            return list(session.scalars(select(ImageAssetRow.id).where(
                ImageAssetRow.status != 'deleted',
                ImageAssetRow.touched_at <= before,
                ImageAssetRow.expires_at <= datetime.now(before.tzinfo),
                ~exists(select(EventRow.id).where(
                    EventRow.poster_asset_id == ImageAssetRow.id,
                )),
            ).order_by(ImageAssetRow.touched_at).limit(limit)))
