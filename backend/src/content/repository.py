from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload, sessionmaker

from .models.domain import (
    Content,
    ContentStatus,
    ContentType,
    ContentVisibility,
    MediaAsset,
    MediaStatus,
)
from .models.orm import ContentRow, MediaAssetRow


class ContentRepository(Protocol):
    def create_content(self, content: Content) -> Content: ...

    def get_content(self, content_id: str) -> Content | None: ...

    def set_status(
        self, content_id: str, status: ContentStatus, *, published_at: datetime | None = None
    ) -> None: ...

    def list_by_creator(
        self,
        creator_id: str,
        *,
        limit: int,
        before: datetime | None,
        statuses: tuple[ContentStatus, ...],
    ) -> list[Content]: ...

    def create_media_asset(self, content_id: str, provider: str, provider_uid: str) -> None: ...

    def get_content_by_provider_uid(self, provider: str, provider_uid: str) -> Content | None: ...

    def mark_media_ready(
        self,
        provider: str,
        provider_uid: str,
        *,
        playback_hls_url: str | None,
        thumbnail_url: str | None,
        duration_seconds: float | None,
        width: int | None,
        height: int | None,
    ) -> None: ...

    def mark_media_errored(self, provider: str, provider_uid: str, error: str) -> None: ...


def _media_from_row(row: MediaAssetRow | None) -> MediaAsset | None:
    if row is None:
        return None
    return MediaAsset(
        id=row.id,
        content_id=row.content_id,
        provider=row.provider,
        provider_uid=row.provider_uid,
        status=MediaStatus(row.status),
        playback_hls_url=row.playback_hls_url,
        thumbnail_url=row.thumbnail_url,
        duration_seconds=row.duration_seconds,
        width=row.width,
        height=row.height,
        error=row.error,
    )


def _content_from_row(row: ContentRow) -> Content:
    return Content(
        id=row.id,
        creator_id=row.creator_id,
        type=ContentType(row.type),
        title=row.title,
        status=ContentStatus(row.status),
        visibility=ContentVisibility(row.visibility),
        description=row.description,
        event_id=row.event_id,
        place_id=row.place_id,
        latitude=row.latitude,
        longitude=row.longitude,
        h3_index=row.h3_index,
        image_url=row.image_url,
        published_at=row.published_at,
        created_at=row.created_at,
        media=_media_from_row(row.media),
    )


class SqlContentRepository:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def create_content(self, content: Content) -> Content:
        row = ContentRow(
            creator_id=content.creator_id,
            type=content.type.value,
            title=content.title,
            description=content.description,
            event_id=content.event_id,
            place_id=content.place_id,
            latitude=content.latitude,
            longitude=content.longitude,
            h3_index=content.h3_index,
            status=content.status.value,
            visibility=content.visibility.value,
            image_url=content.image_url,
            published_at=content.published_at,
        )
        with self._session_factory() as session:
            session.add(row)
            session.commit()
            session.refresh(row)
            return _content_from_row(row)

    def get_content(self, content_id: str) -> Content | None:
        with self._session_factory() as session:
            row = session.execute(
                select(ContentRow)
                .options(joinedload(ContentRow.media))
                .where(ContentRow.id == content_id)
            ).unique().scalar_one_or_none()
            return _content_from_row(row) if row else None

    def set_status(
        self, content_id: str, status: ContentStatus, *, published_at: datetime | None = None
    ) -> None:
        with self._session_factory() as session:
            row = session.get(ContentRow, content_id)
            if row is None:
                return
            row.status = status.value
            if published_at is not None:
                row.published_at = published_at
            session.commit()

    def list_by_creator(
        self,
        creator_id: str,
        *,
        limit: int,
        before: datetime | None,
        statuses: tuple[ContentStatus, ...],
    ) -> list[Content]:
        stmt = (
            select(ContentRow)
            .options(joinedload(ContentRow.media))
            .where(
                ContentRow.creator_id == creator_id,
                ContentRow.status.in_([s.value for s in statuses]),
            )
            .order_by(ContentRow.created_at.desc())
            .limit(limit)
        )
        if before is not None:
            stmt = stmt.where(ContentRow.created_at < before)
        with self._session_factory() as session:
            rows = session.execute(stmt).unique().scalars().all()
            return [_content_from_row(row) for row in rows]

    def create_media_asset(self, content_id: str, provider: str, provider_uid: str) -> None:
        with self._session_factory() as session:
            session.add(
                MediaAssetRow(content_id=content_id, provider=provider, provider_uid=provider_uid)
            )
            session.commit()

    def get_content_by_provider_uid(self, provider: str, provider_uid: str) -> Content | None:
        stmt = (
            select(ContentRow)
            .options(joinedload(ContentRow.media))
            .join(MediaAssetRow, MediaAssetRow.content_id == ContentRow.id)
            .where(
                MediaAssetRow.provider == provider,
                MediaAssetRow.provider_uid == provider_uid,
            )
        )
        with self._session_factory() as session:
            row = session.execute(stmt).unique().scalar_one_or_none()
            return _content_from_row(row) if row else None

    def mark_media_ready(
        self,
        provider: str,
        provider_uid: str,
        *,
        playback_hls_url: str | None,
        thumbnail_url: str | None,
        duration_seconds: float | None,
        width: int | None,
        height: int | None,
    ) -> None:
        with self._session_factory() as session:
            row = self._media_row(session, provider, provider_uid)
            if row is None:
                return
            row.status = MediaStatus.READY.value
            row.playback_hls_url = playback_hls_url
            row.thumbnail_url = thumbnail_url
            row.duration_seconds = duration_seconds
            row.width = width
            row.height = height
            row.updated_at = datetime.now(timezone.utc)
            session.commit()

    def mark_media_errored(self, provider: str, provider_uid: str, error: str) -> None:
        with self._session_factory() as session:
            row = self._media_row(session, provider, provider_uid)
            if row is None:
                return
            row.status = MediaStatus.ERRORED.value
            row.error = error
            session.commit()

    @staticmethod
    def _media_row(session: Session, provider: str, provider_uid: str) -> MediaAssetRow | None:
        return session.execute(
            select(MediaAssetRow).where(
                MediaAssetRow.provider == provider,
                MediaAssetRow.provider_uid == provider_uid,
            )
        ).scalar_one_or_none()
