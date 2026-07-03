from __future__ import annotations

from datetime import datetime, timezone
from itertools import count
from typing import Any

import pytest

from content.models.domain import Content, ContentStatus, ContentType, ContentVisibility, MediaAsset, MediaStatus
from content.service import ContentService
from media.stub import StubMediaProvider
from shared.auth.models import AuthenticatedUser
from shared.errors import NotFoundError, PermissionDeniedError, UnauthorizedError, ValidationFailedError


class FakeContentRepository:
    def __init__(self) -> None:
        self._ids = count(1)
        self.contents: dict[str, Content] = {}
        self.media: dict[tuple[str, str], MediaAsset] = {}

    def create_content(self, content: Content) -> Content:
        content_id = f'content-{next(self._ids)}'
        stored = Content(
            id=content_id,
            creator_id=content.creator_id,
            type=content.type,
            title=content.title,
            status=content.status,
            visibility=content.visibility,
            description=content.description,
            event_id=content.event_id,
            place_id=content.place_id,
            latitude=content.latitude,
            longitude=content.longitude,
            h3_index=content.h3_index,
            image_url=content.image_url,
            published_at=content.published_at,
            created_at=datetime.now(timezone.utc),
        )
        self.contents[content_id] = stored
        return stored

    def get_content(self, content_id: str) -> Content | None:
        return self.contents.get(content_id)

    def set_status(self, content_id: str, status: ContentStatus, *, published_at=None) -> None:  # noqa: ANN001
        content = self.contents[content_id]
        self.contents[content_id] = Content(
            **{**_as_dict(content), 'status': status,
               'published_at': published_at or content.published_at}
        )

    def list_by_creator(self, creator_id: str, *, limit: int, before, statuses) -> list[Content]:  # noqa: ANN001
        return [
            c for c in self.contents.values()
            if c.creator_id == creator_id and c.status in statuses
        ][:limit]

    def create_media_asset(self, content_id: str, provider: str, provider_uid: str) -> None:
        self.media[(provider, provider_uid)] = MediaAsset(
            id=f'media-{content_id}',
            content_id=content_id,
            provider=provider,
            provider_uid=provider_uid,
            status=MediaStatus.PENDING,
        )

    def get_content_by_provider_uid(self, provider: str, provider_uid: str) -> Content | None:
        asset = self.media.get((provider, provider_uid))
        if asset is None:
            return None
        return self.contents.get(asset.content_id)

    def mark_media_ready(self, provider: str, provider_uid: str, **fields: Any) -> None:
        asset = self.media[(provider, provider_uid)]
        self.media[(provider, provider_uid)] = MediaAsset(
            id=asset.id,
            content_id=asset.content_id,
            provider=asset.provider,
            provider_uid=asset.provider_uid,
            status=MediaStatus.READY,
            playback_hls_url=fields.get('playback_hls_url'),
            thumbnail_url=fields.get('thumbnail_url'),
            duration_seconds=fields.get('duration_seconds'),
        )

    def mark_media_errored(self, provider: str, provider_uid: str, error: str) -> None:
        asset = self.media[(provider, provider_uid)]
        self.media[(provider, provider_uid)] = MediaAsset(
            id=asset.id,
            content_id=asset.content_id,
            provider=asset.provider,
            provider_uid=asset.provider_uid,
            status=MediaStatus.ERRORED,
            error=error,
        )


def _as_dict(content: Content) -> dict[str, Any]:
    return {
        'id': content.id,
        'creator_id': content.creator_id,
        'type': content.type,
        'title': content.title,
        'status': content.status,
        'visibility': content.visibility,
        'description': content.description,
        'event_id': content.event_id,
        'place_id': content.place_id,
        'latitude': content.latitude,
        'longitude': content.longitude,
        'h3_index': content.h3_index,
        'image_url': content.image_url,
        'published_at': content.published_at,
        'created_at': content.created_at,
        'media': content.media,
    }


class FakePlaceResolver:
    def __init__(self, place: Any | None = None) -> None:
        self.place = place

    def resolve_city(self, lat: float, lng: float) -> Any | None:
        return self.place


class _Place:
    id = 'place-1'


def _user(user_id: str = 'creator-1', role: str = 'comedian') -> AuthenticatedUser:
    return AuthenticatedUser(user_id=user_id, email=None, role=role)


@pytest.fixture()
def repo() -> FakeContentRepository:
    return FakeContentRepository()


@pytest.fixture()
def provider() -> StubMediaProvider:
    return StubMediaProvider()


@pytest.fixture()
def service(repo: FakeContentRepository, provider: StubMediaProvider) -> ContentService:
    return ContentService(
        repository=repo,
        media_provider=provider,
        place_resolver=FakePlaceResolver(_Place()),
        h3_resolution=9,
    )


def test_create_video_returns_upload_url_and_processing_status(
    service: ContentService, repo: FakeContentRepository
) -> None:
    content, upload_url = service.create(
        _user(), type=ContentType.VIDEO_CLIP, title='My set', latitude=51.5, longitude=-0.1
    )
    assert upload_url is not None
    assert content.status is ContentStatus.PROCESSING
    assert content.place_id == 'place-1'
    assert content.h3_index is not None


def test_create_announcement_publishes_immediately(service: ContentService) -> None:
    content, upload_url = service.create(
        _user(), type=ContentType.ANNOUNCEMENT, title='New tour!'
    )
    assert upload_url is None
    assert content.status is ContentStatus.PUBLISHED
    assert content.published_at is not None


def test_create_image_requires_url(service: ContentService) -> None:
    with pytest.raises(ValidationFailedError):
        service.create(_user(), type=ContentType.IMAGE, title='Poster')


def test_create_image_rejects_http_url(service: ContentService) -> None:
    with pytest.raises(ValidationFailedError):
        service.create(
            _user(), type=ContentType.IMAGE, title='Poster', image_url='http://x.com/i.png'
        )


def test_create_event_promotion_requires_event(service: ContentService) -> None:
    with pytest.raises(ValidationFailedError):
        service.create(_user(), type=ContentType.EVENT_PROMOTION, title='Friday night')


def test_partial_coordinates_rejected(service: ContentService) -> None:
    with pytest.raises(ValidationFailedError):
        service.create(_user(), type=ContentType.ANNOUNCEMENT, title='x', latitude=51.5)


def test_webhook_ready_publishes_video(
    service: ContentService, repo: FakeContentRepository, provider: StubMediaProvider
) -> None:
    content, _ = service.create(_user(), type=ContentType.VIDEO_CLIP, title='My set')
    uid = provider.uploads[0].provider_uid
    service.handle_webhook(b'{}', 'sig', {'uid': uid, 'ready': True, 'duration': 42.0})
    updated = repo.contents[content.id]
    assert updated.status is ContentStatus.PUBLISHED
    assert repo.media[('stub', uid)].status is MediaStatus.READY


def test_webhook_error_reverts_to_draft(
    service: ContentService, repo: FakeContentRepository, provider: StubMediaProvider
) -> None:
    content, _ = service.create(_user(), type=ContentType.VIDEO_CLIP, title='My set')
    uid = provider.uploads[0].provider_uid
    service.handle_webhook(b'{}', 'sig', {'uid': uid, 'ready': False, 'error': 'bad codec'})
    assert repo.contents[content.id].status is ContentStatus.DRAFT
    assert repo.media[('stub', uid)].status is MediaStatus.ERRORED


def test_webhook_unknown_uid_is_ignored(service: ContentService) -> None:
    service.handle_webhook(b'{}', 'sig', {'uid': 'nope', 'ready': True})


def test_webhook_invalid_signature_rejected(
    repo: FakeContentRepository, provider: StubMediaProvider
) -> None:
    class RejectingProvider(StubMediaProvider):
        def verify_webhook(self, body: bytes, signature_header: str | None) -> bool:
            return False

    service = ContentService(
        repository=repo,
        media_provider=RejectingProvider(),
        place_resolver=FakePlaceResolver(),
    )
    with pytest.raises(UnauthorizedError):
        service.handle_webhook(b'{}', None, {'uid': 'x'})


def test_get_hides_unpublished_from_others(service: ContentService) -> None:
    content, _ = service.create(_user(), type=ContentType.VIDEO_CLIP, title='My set')
    assert service.get(content.id, _user()).id == content.id
    with pytest.raises(NotFoundError):
        service.get(content.id, _user('someone-else', 'fan'))


def test_delete_owner_only(service: ContentService, repo: FakeContentRepository) -> None:
    content, _ = service.create(_user(), type=ContentType.ANNOUNCEMENT, title='x')
    with pytest.raises(PermissionDeniedError):
        service.delete(content.id, _user('someone-else', 'fan'))
    service.delete(content.id, _user())
    assert repo.contents[content.id].status is ContentStatus.REMOVED


def test_list_by_creator_filters_for_public_viewers(
    service: ContentService,
) -> None:
    creator = _user()
    service.create(creator, type=ContentType.ANNOUNCEMENT, title='published')
    service.create(creator, type=ContentType.VIDEO_CLIP, title='processing')
    own = service.list_by_creator(creator.user_id, creator)
    public = service.list_by_creator(creator.user_id, _user('fan-1', 'fan'))
    assert len(own) == 2
    assert len(public) == 1
    assert public[0].title == 'published'
