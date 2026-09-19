from __future__ import annotations

from datetime import datetime, timezone
from typing import Protocol

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload, sessionmaker

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

    def create_media_asset(
        self,
        content_id: str,
        provider: str,
        provider_uid: str,
        *,
        upload_protocol: str = 'tus',
        upload_expires_at: datetime | None = None,
        source_mime_type: str | None = None,
        source_size_bytes: int | None = None,
        original_filename: str | None = None,
    ) -> MediaAsset: ...

    def mark_media_uploaded(self, media_asset_id: str) -> None: ...

    def list_stale_media(
        self, *, updated_before: datetime, limit: int
    ) -> list[MediaAsset]: ...

    def mark_media_expired(self, media_asset_id: str) -> None: ...

    def mark_media_cancelled(self, media_asset_id: str) -> None: ...

    def active_upload_count(self, creator_id: str) -> int: ...

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
        attempt_number=row.attempt_number,
        is_current=row.is_current,
        upload_protocol=row.upload_protocol,
        upload_expires_at=row.upload_expires_at,
        source_mime_type=row.source_mime_type,
        source_size_bytes=row.source_size_bytes,
        original_filename=row.original_filename,
        playback_hls_url=row.playback_hls_url,
        thumbnail_url=row.thumbnail_url,
        duration_seconds=row.duration_seconds,
        width=row.width,
        height=row.height,
        error=row.error,
        provider_error_code=row.provider_error_code,
        uploaded_at=row.uploaded_at,
        processing_started_at=row.processing_started_at,
        ready_at=row.ready_at,
        failed_at=row.failed_at,
        last_provider_sync_at=row.last_provider_sync_at,
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
        media=_media_from_row(next((asset for asset in row.media_assets if asset.is_current), None)),
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
                .options(selectinload(ContentRow.media_assets))
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
            .options(selectinload(ContentRow.media_assets))
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

    def create_media_asset(
        self,
        content_id: str,
        provider: str,
        provider_uid: str,
        *,
        upload_protocol: str = 'tus',
        upload_expires_at: datetime | None = None,
        source_mime_type: str | None = None,
        source_size_bytes: int | None = None,
        original_filename: str | None = None,
    ) -> MediaAsset:
        with self._session_factory() as session:
            current = session.execute(
                select(MediaAssetRow).where(
                    MediaAssetRow.content_id == content_id,
                    MediaAssetRow.is_current.is_(True),
                )
            ).scalars().all()
            for asset in current:
                asset.is_current = False
                if asset.status in {
                    MediaStatus.PENDING_UPLOAD.value,
                    MediaStatus.UPLOADED.value,
                    MediaStatus.PROCESSING.value,
                }:
                    asset.status = MediaStatus.CANCELLED.value
            attempt = session.execute(
                select(func.coalesce(func.max(MediaAssetRow.attempt_number), 0)).where(
                    MediaAssetRow.content_id == content_id
                )
            ).scalar_one()
            row = MediaAssetRow(
                content_id=content_id,
                provider=provider,
                provider_uid=provider_uid,
                attempt_number=attempt + 1,
                upload_protocol=upload_protocol,
                upload_expires_at=upload_expires_at,
                source_mime_type=source_mime_type,
                source_size_bytes=source_size_bytes,
                original_filename=original_filename,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return _media_from_row(row)  # type: ignore[return-value]

    def mark_media_uploaded(self, media_asset_id: str) -> None:
        now = datetime.now(timezone.utc)
        with self._session_factory() as session:
            row = session.get(MediaAssetRow, media_asset_id)
            if row is None or not row.is_current:
                return
            if row.status == MediaStatus.PENDING_UPLOAD.value:
                row.status = MediaStatus.UPLOADED.value
                row.uploaded_at = now
                row.processing_started_at = now
                row.status = MediaStatus.PROCESSING.value
                session.commit()

    def list_stale_media(
        self, *, updated_before: datetime, limit: int
    ) -> list[MediaAsset]:
        stmt = (
            select(MediaAssetRow)
            .where(
                MediaAssetRow.is_current.is_(True),
                MediaAssetRow.status.in_(
                    [
                        MediaStatus.PENDING_UPLOAD.value,
                        MediaStatus.UPLOADED.value,
                        MediaStatus.PROCESSING.value,
                    ]
                ),
                MediaAssetRow.updated_at < updated_before,
            )
            .order_by(MediaAssetRow.updated_at)
            .limit(limit)
        )
        with self._session_factory() as session:
            return [_media_from_row(row) for row in session.execute(stmt).scalars()]

    def mark_media_expired(self, media_asset_id: str) -> None:
        with self._session_factory() as session:
            row = session.get(MediaAssetRow, media_asset_id)
            if row is None or row.status != MediaStatus.PENDING_UPLOAD.value:
                return
            row.status = MediaStatus.EXPIRED.value
            row.failed_at = datetime.now(timezone.utc)
            session.commit()

    def mark_media_cancelled(self, media_asset_id: str) -> None:
        with self._session_factory() as session:
            row = session.get(MediaAssetRow, media_asset_id)
            if row is None or not row.is_current:
                return
            if row.status != MediaStatus.READY.value:
                row.status = MediaStatus.CANCELLED.value
                row.failed_at = datetime.now(timezone.utc)
            session.commit()

    def active_upload_count(self, creator_id: str) -> int:
        stmt = (
            select(func.count())
            .select_from(MediaAssetRow)
            .join(ContentRow, ContentRow.id == MediaAssetRow.content_id)
            .where(
                ContentRow.creator_id == creator_id,
                MediaAssetRow.is_current.is_(True),
                MediaAssetRow.status.in_(
                    [
                        MediaStatus.PENDING_UPLOAD.value,
                        MediaStatus.UPLOADED.value,
                        MediaStatus.PROCESSING.value,
                    ]
                ),
            )
        )
        with self._session_factory() as session:
            return session.execute(stmt).scalar_one()

    def get_content_by_provider_uid(self, provider: str, provider_uid: str) -> Content | None:
        stmt = (
            select(ContentRow)
            .options(selectinload(ContentRow.media_assets))
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
            row.ready_at = datetime.now(timezone.utc)
            row.updated_at = datetime.now(timezone.utc)
            session.commit()

    def mark_media_errored(self, provider: str, provider_uid: str, error: str) -> None:
        with self._session_factory() as session:
            row = self._media_row(session, provider, provider_uid)
            if row is None:
                return
            row.status = MediaStatus.FAILED.value
            row.error = error
            row.failed_at = datetime.now(timezone.utc)
            row.last_provider_sync_at = datetime.now(timezone.utc)
            session.commit()

    @staticmethod
    def _media_row(session: Session, provider: str, provider_uid: str) -> MediaAssetRow | None:
        return session.execute(
            select(MediaAssetRow).where(
                MediaAssetRow.provider == provider,
                MediaAssetRow.provider_uid == provider_uid,
            )
        ).scalar_one_or_none()
