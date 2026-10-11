"""Required-image publication, privacy and recovery across the owning domain ports."""

from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from pydantic import ValidationError

from content.models.domain import ContentType
from content.service import ContentService
from events.controller import (
    create_native_draft, get_event, list_owned_events, poster_config, publish_event, router,
    update_native_draft,
)
from events.models.domain import EventPublicationStatus, EventStatus
from events.publication import validate_publication
from events.schemas import CreateNativeEventRequest, UpdateNativeDraftRequest
from images.ports import PosterEvent
from images.schemas import PosterAttachRequest
from images.service import PosterService
from images.storage import DISPLAY_BUCKET, PosterUnavailableError, StorageError
from media.stub import StubMediaProvider
from shared.auth.models import AuthenticatedUser
from shared.errors import ConflictError, NotFoundError, PermissionDeniedError, ValidationFailedError
from tests.test_content import FakeContentRepository
from tests.test_gig_posters import FakeImages, FakeStorage, image_bytes
from tests.test_native_event_idempotency import setup
from tests.test_native_events import USER
from tests.test_events import FakePlaceLookup


PAYLOAD = {
    'title': 'Comedy', 'localStartTime': '2099-01-01T20:00', 'timeZone': 'UTC',
}


class BoundEvents:
    def __init__(self, repository):
        self.repository = repository
        self.fail_swap = False

    def get(self, event_id):
        event = self.repository.get(event_id)
        return None if event is None else PosterEvent(
            event.id, event.venue_id, event.poster_asset_id, event.poster_revision,
            event.publication_status.value,
        )

    def referenced(self, asset_id):
        return any(event.poster_asset_id == asset_id for event in self.repository.events.values())

    def validate_publication(self, event_id):
        validate_publication(self.repository.get(event_id))

    def swap(self, event_id, owner_id, expected_revision, asset, url, *, publish=False):
        event = self.repository.get(event_id)
        if self.fail_swap or event.poster_revision != expected_revision or event.venue_id != owner_id:
            raise ConflictError('poster changed')
        if publish:
            validate_publication(event)
        elif asset is None and event.publication_status is EventPublicationStatus.PUBLISHED:
            raise ConflictError('published gigs require an image')
        elif asset is not None and event.publication_status is EventPublicationStatus.DRAFT:
            raise ConflictError('use publication')
        self.repository.events[event_id] = replace(
            event, poster_asset_id=asset.id if asset else None, poster_url=url,
            poster_width=asset.width if asset else None, poster_height=asset.height if asset else None,
            poster_revision=event.poster_revision + 1,
            publication_status=EventPublicationStatus.PUBLISHED if publish else event.publication_status,
        )


def lifecycle():
    events, repository = setup()
    draft = create_native_draft(
        CreateNativeEventRequest(**PAYLOAD), USER, events, idempotency_key=str(uuid4()),
    )
    images, storage, port = FakeImages(), FakeStorage(), BoundEvents(repository)
    images.events = port
    posters = PosterService(images, storage, port)
    return draft, events, repository, posters, images, storage, port


def prepared(draft, posters, storage):
    data = image_bytes()
    intent = posters.initiate(draft.id, USER, 'image/png', len(data))
    storage.objects[intent.bucket_name, intent.object_name] = data
    posters.complete(draft.id, intent.asset_id, USER)
    return intent.asset_id


def test_create_prepare_publish_returns_one_public_event_and_attached_asset():
    draft, events, repository, posters, images, storage, _ = lifecycle()
    assert draft.publicationStatus == 'draft'
    assert len(repository.events) == 1
    assert events.list_nearby(51.5, -0.1) == []
    assert events.list_by_venue(USER.user_id, upcoming_only=False) == []
    with pytest.raises(NotFoundError):
        events.get(draft.id)
    asset_id = prepared(draft, posters, storage)
    assert events.get(draft.id, USER).publication_status is EventPublicationStatus.DRAFT
    published = publish_event(
        draft.id, PosterAttachRequest(assetId=asset_id, expectedRevision=0), USER, posters, events,
    )
    assert published.publicationStatus == 'published'
    assert published.posterRevision == 1
    assert published.posterUrl and (published.posterWidth, published.posterHeight) == (24, 32)
    assert images.assets[asset_id].status == 'attached'
    assert len(repository.events) == 1
    assert events.get(draft.id).publication_status is EventPublicationStatus.PUBLISHED
    assert [event.id for event in events.list_nearby(51.5, -0.1)] == [draft.id]


def test_owner_details_and_owner_list_include_private_past_cancelled_drafts():
    draft, events, repository, _, _, _, _ = lifecycle()
    repository.events[draft.id] = replace(
        repository.events[draft.id], start_time=datetime(2000, 1, 1, tzinfo=timezone.utc),
        status=EventStatus.CANCELLED,
    )
    owner = list_owned_events(USER, events, limit=50)
    assert [(event.id, event.status, event.publicationStatus) for event in owner.items] == [
        (draft.id, 'cancelled', 'draft'),
    ]
    assert get_event(draft.id, USER, events).id == draft.id
    for viewer in (AuthenticatedUser('fan', None, 'fan'), replace(USER, user_id='other')):
        with pytest.raises(NotFoundError):
            get_event(draft.id, viewer, events)
    assert events.list_by_venue(USER.user_id, upcoming_only=False) == []
    assert events.list_owned(replace(USER, user_id='other')) == []
    paths = [route.path for route in router.routes]
    assert paths.index('/venues/me/events') < paths.index('/venues/{venue_id}/events')


@pytest.mark.parametrize('field,value', [
    ('status', 'uploading'), ('status', 'failed'), ('status', 'retired'), ('status', 'deleted'),
    ('width', None), ('width', 0), ('height', -1), ('output_type', None),
])
def test_unready_or_invalid_image_never_publishes(field, value):
    draft, events, _, posters, images, storage, _ = lifecycle()
    asset_id = prepared(draft, posters, storage)
    setattr(images.assets[asset_id], field, value)
    with pytest.raises(ConflictError):
        posters.publish(draft.id, asset_id, 0, USER)
    assert events.get(draft.id, USER).publication_status is EventPublicationStatus.DRAFT
    assert not any(bucket == DISPLAY_BUCKET for bucket, _ in storage.objects)


@pytest.mark.parametrize('field,value', [
    ('owner_id', 'other'), ('event_id', 'other'), ('purpose', 'avatar'),
])
def test_foreign_image_cannot_publish(field, value):
    draft, events, _, posters, images, storage, _ = lifecycle()
    asset_id = prepared(draft, posters, storage)
    setattr(images.assets[asset_id], field, value)
    with pytest.raises(PermissionDeniedError):
        posters.publish(draft.id, asset_id, 0, USER)
    assert events.get(draft.id, USER).publication_status is EventPublicationStatus.DRAFT


def test_missing_image_and_legacy_attach_cannot_publish():
    draft, events, _, posters, _, storage, _ = lifecycle()
    with pytest.raises(NotFoundError):
        posters.publish(draft.id, str(uuid4()), 0, USER)
    asset_id = prepared(draft, posters, storage)
    with pytest.raises(ConflictError, match='publication'):
        posters.attach(draft.id, asset_id, 0, USER)
    assert events.get(draft.id, USER).poster_url is None


@pytest.mark.parametrize('changes', [
    {'start_time': datetime(2000, 1, 1, tzinfo=timezone.utc)},
    {'status': EventStatus.CANCELLED}, {'latitude': None},
    {'longitude': float('inf')}, {'latitude': 91},
])
def test_publication_rechecks_time_schedule_and_location(changes):
    draft, events, repository, posters, _, storage, _ = lifecycle()
    asset_id = prepared(draft, posters, storage)
    repository.events[draft.id] = replace(repository.events[draft.id], **changes)
    with pytest.raises((ConflictError, ValidationFailedError)):
        posters.publish(draft.id, asset_id, 0, USER)
    assert events.get(draft.id, USER).publication_status is EventPublicationStatus.DRAFT
    assert not any(bucket == DISPLAY_BUCKET for bucket, _ in storage.objects)


def test_storage_and_cas_failure_keep_recoverable_private_draft():
    draft, events, _, posters, images, storage, port = lifecycle()
    asset_id = prepared(draft, posters, storage)
    storage.fail_put = DISPLAY_BUCKET
    with pytest.raises(StorageError):
        posters.publish(draft.id, asset_id, 0, USER)
    assert images.assets[asset_id].status == 'ready'
    assert events.get(draft.id, USER).publication_status is EventPublicationStatus.DRAFT
    storage.fail_put = None
    port.fail_swap = True
    with pytest.raises(ConflictError):
        posters.publish(draft.id, asset_id, 0, USER)
    assert images.assets[asset_id].status == 'ready'
    with pytest.raises(NotFoundError):
        events.get(draft.id)
    port.fail_swap = False
    posters.publish(draft.id, asset_id, 0, USER)
    assert events.get(draft.id).publication_status is EventPublicationStatus.PUBLISHED


def test_publish_replays_same_asset_after_time_passes_without_storage_write(monkeypatch):
    draft, events, repository, posters, _, storage, _ = lifecycle()
    asset_id = prepared(draft, posters, storage)
    posters.publish(draft.id, asset_id, 0, USER)
    repository.events[draft.id] = replace(
        repository.events[draft.id], start_time=datetime(2000, 1, 1, tzinfo=timezone.utc),
    )
    writes = list(storage.puts)
    storage.fail_put = DISPLAY_BUCKET
    for revision in (0, 1):
        posters.publish(draft.id, asset_id, revision, USER)
    assert events.get(draft.id).poster_revision == 1
    assert storage.puts == writes


def test_concurrent_publishers_one_winner_same_asset_replay_no_duplicates():
    draft, events, repository, posters, images, storage, _ = lifecycle()
    first, second = prepared(draft, posters, storage), prepared(draft, posters, storage)

    def publish(asset_id):
        try:
            posters.publish(draft.id, asset_id, 0, USER)
            return True
        except ConflictError:
            return False

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(publish, (first, second))) == [False, True]
    assert len(repository.events) == 1
    assert sum(asset.status == 'attached' for asset in images.assets.values()) == 1
    winner = events.get(draft.id).poster_asset_id
    with ThreadPoolExecutor(max_workers=4) as pool:
        assert all(pool.map(publish, [winner] * 4))
    assert events.get(draft.id).poster_revision == 1


def test_draft_completion_cas_prevents_stale_publish_and_is_owner_only():
    draft, events, _, posters, _, storage, _ = lifecycle()
    asset_id = prepared(draft, posters, storage)
    body = UpdateNativeDraftRequest(**(PAYLOAD | {'title': 'Revised', 'expectedRevision': 0}))
    updated = update_native_draft(draft.id, body, USER, events)
    assert (updated.title, updated.posterRevision, updated.publicationStatus) == ('Revised', 1, 'draft')
    with pytest.raises(ConflictError):
        update_native_draft(draft.id, body, USER, events)
    with pytest.raises(PermissionDeniedError):
        update_native_draft(draft.id, body, replace(USER, user_id='other'), events)
    with pytest.raises(ConflictError):
        posters.publish(draft.id, asset_id, 0, USER)
    posters.publish(draft.id, asset_id, 1, USER)
    with pytest.raises(ConflictError):
        update_native_draft(draft.id, body, USER, events)


def test_draft_completion_validates_before_mutation_and_required_revision():
    draft, events, _, _, _, _, _ = lifecycle()
    with pytest.raises(ValidationError):
        UpdateNativeDraftRequest(**PAYLOAD)
    with pytest.raises(ValidationFailedError):
        update_native_draft(
            draft.id, UpdateNativeDraftRequest(**(PAYLOAD | {
                'localStartTime': '2000-01-01T20:00', 'expectedRevision': 0,
            })), USER, events,
        )
    assert events.get(draft.id, USER).poster_revision == 0


def test_new_legacy_native_rejected_but_original_key_recovers_without_new_event():
    events, repository = setup()
    arguments = dict(title='Comedy', local_start_time='2099-01-01T20:00', time_zone='UTC')
    key = str(uuid4())
    with pytest.raises(ConflictError, match='update required'):
        events.create_native(USER, **arguments, idempotency_key=key)
    assert repository.events == {}
    draft = events.create_native_draft(USER, **arguments, idempotency_key=key)
    with pytest.raises(ConflictError, match='update required'):
        events.create_native(USER, **arguments, idempotency_key=key)
    assert events.create_native_draft(USER, **arguments, idempotency_key=key).id == draft.id
    with pytest.raises(ConflictError):
        events.create_native_draft(USER, **(arguments | {'title': 'Changed'}), idempotency_key=key)
    assert len(repository.events) == 1


def test_legacy_stored_submission_hash_recovered_by_new_draft_endpoint():
    events, repository = setup()
    arguments = dict(title='Comedy', local_start_time='2099-01-01T20:00', time_zone='UTC')
    key = str(uuid4())
    first = events.create_native_draft(USER, **arguments, idempotency_key=key)
    repository.publish_fixture(first.id)
    replay = events.create_native_draft(USER, **arguments, idempotency_key=key)
    assert replay.id == first.id and replay.publication_status is EventPublicationStatus.PUBLISHED
    assert events.create_native(USER, **arguments, idempotency_key=key).id == first.id
    assert len(repository.events) == 1


def test_linked_content_rejects_drafts_but_accepts_published():
    draft, events, repository, _, _, _, _ = lifecycle()
    content_repository = FakeContentRepository()
    content = ContentService(
        content_repository, StubMediaProvider(), FakePlaceLookup(), events=events,
    )
    with pytest.raises(ValidationFailedError, match='published'):
        content.create(USER, type=ContentType.EVENT_PROMOTION, title='Promo', event_id=draft.id)
    with pytest.raises(ValidationFailedError, match='published'):
        content.create(USER, type=ContentType.VIDEO_CLIP, title='Clip', event_id=draft.id)
    repository.publish_fixture(draft.id)
    created, _ = content.create(
        USER, type=ContentType.EVENT_PROMOTION, title='Promo', event_id=draft.id,
    )
    assert created.event_id == draft.id


def test_config_is_mandatory_limits_adapter_not_optional_capability():
    _, _, _, posters, _, _, _ = lifecycle()
    config = poster_config(USER, posters)
    assert config.enabled is True
    assert config.maxBytes == 10 * 1024 * 1024 and config.maxPixels == 25_000_000
    assert set(config.supportedContentTypes) == {'image/jpeg', 'image/png', 'image/webp'}
    with pytest.raises(PosterUnavailableError):
        poster_config(USER, PosterService(None, None, posters._events))


def test_public_reads_and_home_remain_available_without_storage_and_drafts_do_not_fill_limit():
    from tests.test_feed import FakeFeedRepository, _service

    draft, events, repository, _, _, _, _ = lifecycle()
    published = events.create_native_draft(
        USER, title='Public Comedy', local_start_time='2099-01-02T20:00', time_zone='UTC',
    )
    repository.publish_fixture(published.id)
    # An earlier private draft must not consume the sole public query result.
    assert [event.id for event in events.list_by_venue(USER.user_id, limit=1)] == [published.id]
    assert [event.id for event in events.list_nearby(51.5, -0.1, limit=1)] == [published.id]
    feed = _service(FakeFeedRepository())
    feed._events = events
    assert [event.id for event in feed.home_feed('fan', lat=51.5, lng=-0.1).nearby_events] == [
        published.id,
    ]
    with pytest.raises(PosterUnavailableError):
        poster_config(USER, PosterService(None, None, BoundEvents(repository)))
    assert events.get(published.id).title == 'Public Comedy'
    with pytest.raises(NotFoundError):
        events.get(draft.id)


def test_completion_fault_does_not_publish_or_make_draft_public():
    draft, events, _, posters, images, storage, _ = lifecycle()
    data = image_bytes()
    intent = posters.initiate(draft.id, USER, 'image/png', len(data))
    storage.objects[intent.bucket_name, intent.object_name] = data
    storage.fail_put = intent.bucket_name
    with pytest.raises(StorageError):
        posters.complete(draft.id, intent.asset_id, USER)
    assert images.assets[intent.asset_id].status == 'uploading'
    assert events.get(draft.id, USER).publication_status is EventPublicationStatus.DRAFT
    assert events.list_by_venue(USER.user_id) == []
    storage.fail_put = None
    posters.complete(draft.id, intent.asset_id, USER)
    posters.publish(draft.id, intent.asset_id, 0, USER)
    assert events.get(draft.id).poster_revision == 1


def test_owner_limit_prioritizes_recent_preparations_over_old_dates():
    draft, events, repository, _, _, _, _ = lifecycle()
    for number in range(60):
        old = events.create_native_draft(
            USER, title=f'Historical gig {number}', local_start_time='2099-01-01T20:00',
            time_zone='UTC',
        )
        repository.events[old.id] = replace(
            repository.events[old.id], start_time=datetime(2000, 1, 1, tzinfo=timezone.utc),
            created_at=datetime(2000, 1, 1, tzinfo=timezone.utc), status=EventStatus.CANCELLED,
        )
    owner = list_owned_events(USER, events, limit=1)
    assert [event.id for event in owner.items] == [draft.id]
    assert owner.items[0].publicationStatus == 'draft'
