from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol

import h3

from media.provider import DirectUpload, MediaProvider, ProviderStatus
from shared.auth.models import AuthenticatedUser
from shared.errors import (
    ConflictError,
    NotFoundError,
    PermissionDeniedError,
    UnauthorizedError,
    ValidationFailedError,
)
from shared.logging import get_logger

from .models.domain import (
    Content,
    ContentStatus,
    ContentType,
    ContentVisibility,
    MediaStatus,
)
from .repository import ContentRepository

logger = get_logger(__name__)


class PlaceResolver(Protocol):
    """Narrow view of the location repository used for content stamping."""

    def resolve_city(self, lat: float, lng: float) -> Any | None: ...


class ContentService:
    def __init__(
        self,
        repository: ContentRepository,
        media_provider: MediaProvider,
        place_resolver: PlaceResolver,
        *,
        h3_resolution: int = 9,
        max_video_duration_seconds: int = 300,
        max_video_size_bytes: int = 500 * 1024 * 1024,
        max_active_uploads_per_creator: int = 2,
    ) -> None:
        self._repository = repository
        self._media = media_provider
        self._places = place_resolver
        self._h3_resolution = h3_resolution
        self._max_video_duration = max_video_duration_seconds
        self._max_video_size = max_video_size_bytes
        self._max_active_uploads = max_active_uploads_per_creator

    def create(
        self,
        user: AuthenticatedUser,
        *,
        type: ContentType,
        title: str,
        description: str | None = None,
        visibility: ContentVisibility = ContentVisibility.PUBLIC,
        latitude: float | None = None,
        longitude: float | None = None,
        event_id: str | None = None,
        image_url: str | None = None,
        file_size_bytes: int | None = None,
        file_mime_type: str | None = None,
        original_filename: str | None = None,
    ) -> tuple[Content, DirectUpload | None]:
        """Create content. Returns the content and, for videos, an upload URL."""

        if type is ContentType.IMAGE and not image_url:
            raise ValidationFailedError('image content requires imageUrl')
        if type is ContentType.EVENT_PROMOTION and not event_id:
            raise ValidationFailedError('event promotion requires eventId')
        if (latitude is None) != (longitude is None):
            raise ValidationFailedError('latitude and longitude must be provided together')
        if image_url is not None and not image_url.startswith('https://'):
            raise ValidationFailedError('imageUrl must be https')

        place_id: str | None = None
        h3_index: str | None = None
        if latitude is not None and longitude is not None:
            h3_index = h3.latlng_to_cell(latitude, longitude, self._h3_resolution)
            place = self._places.resolve_city(latitude, longitude)
            if place is not None:
                place_id = place.id

        is_video = type is ContentType.VIDEO_CLIP
        if is_video and self._repository.active_upload_count(user.user_id) >= self._max_active_uploads:
            raise ConflictError('creator already has the maximum number of active uploads')
        if is_video and file_size_bytes is not None:
            if file_size_bytes <= 0 or file_size_bytes > self._max_video_size:
                raise ValidationFailedError('video file size is outside the allowed range')
        if is_video and file_mime_type is not None and not file_mime_type.startswith('video/'):
            raise ValidationFailedError('video file MIME type must start with video/')
        now = datetime.now(timezone.utc)
        content = self._repository.create_content(
            Content(
                id='',  # assigned by the database
                creator_id=user.user_id,
                type=type,
                title=title,
                description=description,
                status=ContentStatus.PROCESSING if is_video else ContentStatus.PUBLISHED,
                visibility=visibility,
                event_id=event_id,
                place_id=place_id,
                latitude=latitude,
                longitude=longitude,
                h3_index=h3_index,
                image_url=image_url,
                published_at=None if is_video else now,
            )
        )

        upload: DirectUpload | None = None
        if is_video:
            upload = self._media.create_direct_upload(
                max_duration_seconds=self._max_video_duration,
                size_bytes=file_size_bytes,
                mime_type=file_mime_type,
            )
            media_asset = self._repository.create_media_asset(
                content.id,
                self._media.name,
                upload.provider_uid,
                upload_protocol=upload.protocol,
                upload_expires_at=upload.expires_at,
                source_mime_type=file_mime_type,
                source_size_bytes=file_size_bytes,
                original_filename=original_filename,
            )
            upload = replace(upload, media_asset_id=media_asset.id)
            logger.info(
                'video_upload_initialized',
                content_id=content.id,
                media_asset_id=media_asset.id,
                provider=self._media.name,
                size_bytes=file_size_bytes,
            )

        return content, upload

    def confirm_upload(
        self, content_id: str, media_asset_id: str, user: AuthenticatedUser
    ) -> Content:
        content = self._repository.get_content(content_id)
        if content is None:
            raise NotFoundError('content not found')
        if content.creator_id != user.user_id:
            raise PermissionDeniedError('only the creator can confirm an upload')
        if content.media is None or content.media.id != media_asset_id:
            raise ConflictError('media asset is not the current upload attempt')
        if content.media.status in {MediaStatus.READY, MediaStatus.PROCESSING}:
            return content
        if content.media.status is not MediaStatus.PENDING_UPLOAD:
            raise ConflictError('media asset cannot be completed from its current state')
        self._repository.mark_media_uploaded(media_asset_id)
        logger.info(
            'video_upload_completed', content_id=content_id, media_asset_id=media_asset_id
        )
        return self._repository.get_content(content_id) or content

    def handle_webhook(
        self, body: bytes, signature_header: str | None, payload: dict[str, Any]
    ) -> None:
        if not self._media.verify_webhook(body, signature_header):
            raise UnauthorizedError('invalid webhook signature')
        event = self._media.parse_webhook(payload)
        content = self._repository.get_content_by_provider_uid(
            self._media.name, event.provider_uid
        )
        if content is None:
            logger.warning('webhook for unknown media asset', provider_uid=event.provider_uid)
            return
        self._apply_provider_result(
            content,
            ProviderStatus(
                provider_uid=event.provider_uid,
                state='ready' if event.ready else 'failed' if event.error else 'processing',
                ready=event.ready,
                playback_hls_url=event.playback_hls_url,
                thumbnail_url=event.thumbnail_url,
                duration_seconds=event.duration_seconds,
                width=event.width,
                height=event.height,
                error=event.error,
            ),
        )

    def reconcile_stale_media(self, *, stale_after_seconds: int = 120, limit: int = 50) -> tuple[int, int]:
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=stale_after_seconds)
        repaired = 0
        failed = 0
        for asset in self._repository.list_stale_media(updated_before=cutoff, limit=limit):
            if (
                asset.status is MediaStatus.PENDING_UPLOAD
                and asset.upload_expires_at is not None
                and asset.upload_expires_at <= datetime.now(timezone.utc)
            ):
                self._repository.mark_media_expired(asset.id)
                failed += 1
                continue
            content = self._repository.get_content_by_provider_uid(
                asset.provider, asset.provider_uid
            )
            if content is None:
                continue
            if content.status is ContentStatus.REMOVED:
                try:
                    self._media.delete_asset(asset.provider_uid)
                    self._repository.mark_media_cancelled(asset.id)
                    repaired += 1
                except Exception as exc:
                    logger.warning('media cleanup provider failure',
                                   provider_uid=asset.provider_uid,
                                   error=type(exc).__name__)
                    failed += 1
                continue
            try:
                provider_status = self._media.get_status(asset.provider_uid)
            except Exception as exc:
                logger.warning('media reconciliation provider failure',
                               provider_uid=asset.provider_uid, error=type(exc).__name__)
                failed += 1
                continue
            self._apply_provider_result(content, provider_status)
            repaired += 1
        return repaired, failed

    def _apply_provider_result(self, content: Content, result: ProviderStatus) -> None:
        if result.error:
            self._repository.mark_media_errored(
                self._media.name, result.provider_uid, result.error
            )
            self._repository.set_status(content.id, ContentStatus.DRAFT)
            logger.warning(
                'video_processing_failed',
                content_id=content.id,
                provider_uid=result.provider_uid,
                error_code=result.error_code,
            )
            return
        if not result.ready:
            return
        self._repository.mark_media_ready(
            self._media.name,
            result.provider_uid,
            playback_hls_url=result.playback_hls_url,
            thumbnail_url=result.thumbnail_url,
            duration_seconds=result.duration_seconds,
            width=result.width,
            height=result.height,
        )
        if content.status is not ContentStatus.REMOVED:
            self._repository.set_status(
                content.id, ContentStatus.PUBLISHED, published_at=datetime.now(timezone.utc)
            )
            logger.info(
                'video_published', content_id=content.id, provider_uid=result.provider_uid
            )

    def get(self, content_id: str, viewer: AuthenticatedUser) -> Content:
        content = self._repository.get_content(content_id)
        if content is None:
            raise NotFoundError('content not found')
        if content.status is not ContentStatus.PUBLISHED and content.creator_id != viewer.user_id:
            raise NotFoundError('content not found')
        return content

    def delete(self, content_id: str, user: AuthenticatedUser) -> None:
        content = self._repository.get_content(content_id)
        if content is None:
            raise NotFoundError('content not found')
        if content.creator_id != user.user_id:
            raise PermissionDeniedError('only the creator can remove content')
        self._repository.set_status(content_id, ContentStatus.REMOVED)
        logger.info('content_removed', content_id=content_id, creator_id=user.user_id)

    def list_by_creator(
        self,
        creator_id: str,
        viewer: AuthenticatedUser,
        *,
        limit: int = 20,
        before: datetime | None = None,
    ) -> list[Content]:
        if viewer.user_id == creator_id:
            statuses = (ContentStatus.DRAFT, ContentStatus.PROCESSING, ContentStatus.PUBLISHED)
        else:
            statuses = (ContentStatus.PUBLISHED,)
        return self._repository.list_by_creator(
            creator_id, limit=limit, before=before, statuses=statuses
        )
