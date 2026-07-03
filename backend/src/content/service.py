from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol

import h3

from media.provider import MediaProvider
from shared.auth.models import AuthenticatedUser
from shared.errors import (
    NotFoundError,
    PermissionDeniedError,
    UnauthorizedError,
    ValidationFailedError,
)
from shared.logging import get_logger

from .models.domain import Content, ContentStatus, ContentType, ContentVisibility
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
    ) -> None:
        self._repository = repository
        self._media = media_provider
        self._places = place_resolver
        self._h3_resolution = h3_resolution
        self._max_video_duration = max_video_duration_seconds

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
    ) -> tuple[Content, str | None]:
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

        upload_url: str | None = None
        if is_video:
            upload = self._media.create_direct_upload(
                max_duration_seconds=self._max_video_duration
            )
            self._repository.create_media_asset(
                content.id, self._media.name, upload.provider_uid
            )
            upload_url = upload.upload_url

        return content, upload_url

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
        if event.error:
            self._repository.mark_media_errored(
                self._media.name, event.provider_uid, event.error
            )
            self._repository.set_status(content.id, ContentStatus.DRAFT)
            return
        if not event.ready:
            return
        self._repository.mark_media_ready(
            self._media.name,
            event.provider_uid,
            playback_hls_url=event.playback_hls_url,
            thumbnail_url=event.thumbnail_url,
            duration_seconds=event.duration_seconds,
            width=event.width,
            height=event.height,
        )
        if content.status is not ContentStatus.REMOVED:
            self._repository.set_status(
                content.id, ContentStatus.PUBLISHED, published_at=datetime.now(timezone.utc)
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
