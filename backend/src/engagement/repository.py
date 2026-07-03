from __future__ import annotations

from datetime import datetime
from typing import Protocol

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, sessionmaker

from content.models.orm import ContentRow, MediaAssetRow

from .models.domain import EngagementEvent, SavedItem
from .models.orm import EngagementEventRow, LikeRow, SaveRow


class EngagementRepository(Protocol):
    def save(self, user_id: str, content_id: str) -> bool: ...

    def unsave(self, user_id: str, content_id: str) -> bool: ...

    def like(self, user_id: str, content_id: str) -> bool: ...

    def unlike(self, user_id: str, content_id: str) -> bool: ...

    def list_saved(
        self, user_id: str, *, limit: int, before: datetime | None
    ) -> list[SavedItem]: ...

    def counts_for(self, content_id: str) -> tuple[int, int]:
        """Return (like_count, save_count)."""
        ...

    def viewer_state(self, user_id: str, content_id: str) -> tuple[bool, bool]:
        """Return (liked, saved)."""
        ...

    def record_events(self, events: list[EngagementEvent]) -> int: ...


class SqlEngagementRepository:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def save(self, user_id: str, content_id: str) -> bool:
        return self._insert_pair(SaveRow, user_id, content_id)

    def unsave(self, user_id: str, content_id: str) -> bool:
        return self._delete_pair(SaveRow, user_id, content_id)

    def like(self, user_id: str, content_id: str) -> bool:
        return self._insert_pair(LikeRow, user_id, content_id)

    def unlike(self, user_id: str, content_id: str) -> bool:
        return self._delete_pair(LikeRow, user_id, content_id)

    def list_saved(
        self, user_id: str, *, limit: int, before: datetime | None
    ) -> list[SavedItem]:
        stmt = (
            select(SaveRow, ContentRow, MediaAssetRow.thumbnail_url)
            .join(ContentRow, ContentRow.id == SaveRow.content_id)
            .outerjoin(MediaAssetRow, MediaAssetRow.content_id == ContentRow.id)
            .where(SaveRow.user_id == user_id, ContentRow.status == 'published')
            .order_by(SaveRow.created_at.desc())
            .limit(limit)
        )
        if before is not None:
            stmt = stmt.where(SaveRow.created_at < before)
        with self._session_factory() as session:
            rows = session.execute(stmt).all()
            return [
                SavedItem(
                    content_id=save.content_id,
                    saved_at=save.created_at,
                    title=content.title,
                    content_type=content.type,
                    creator_id=content.creator_id,
                    thumbnail_url=thumbnail_url,
                    image_url=content.image_url,
                )
                for save, content, thumbnail_url in rows
            ]

    def counts_for(self, content_id: str) -> tuple[int, int]:
        with self._session_factory() as session:
            likes = session.execute(
                select(func.count()).where(LikeRow.content_id == content_id)
            ).scalar_one()
            saves = session.execute(
                select(func.count()).where(SaveRow.content_id == content_id)
            ).scalar_one()
            return likes, saves

    def viewer_state(self, user_id: str, content_id: str) -> tuple[bool, bool]:
        with self._session_factory() as session:
            liked = session.get(LikeRow, (user_id, content_id)) is not None
            saved = session.get(SaveRow, (user_id, content_id)) is not None
            return liked, saved

    def record_events(self, events: list[EngagementEvent]) -> int:
        rows = [
            EngagementEventRow(
                user_id=event.user_id,
                content_id=event.content_id,
                event_type=event.event_type.value,
                occurred_at=event.occurred_at,
                metadata_=event.metadata or None,
            )
            for event in events
        ]
        with self._session_factory() as session:
            session.add_all(rows)
            session.commit()
            return len(rows)

    def _insert_pair(self, model, user_id: str, content_id: str) -> bool:  # noqa: ANN001
        stmt = (
            pg_insert(model)
            .values(user_id=user_id, content_id=content_id)
            .on_conflict_do_nothing()
        )
        with self._session_factory() as session:
            result = session.execute(stmt)
            session.commit()
            return bool(result.rowcount)

    def _delete_pair(self, model, user_id: str, content_id: str) -> bool:  # noqa: ANN001
        stmt = delete(model).where(
            model.user_id == user_id, model.content_id == content_id
        )
        with self._session_factory() as session:
            result = session.execute(stmt)
            session.commit()
            return bool(result.rowcount)
