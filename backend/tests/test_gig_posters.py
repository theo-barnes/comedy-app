from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from copy import deepcopy
from dataclasses import replace
from datetime import datetime, timedelta, timezone
from io import BytesIO
from threading import RLock
from typing import get_type_hints
from unittest.mock import Mock

from PIL import Image, PngImagePlugin
import pytest
from pydantic import ValidationError

from events.controller import (
    PosterWriteRateLimit, VenueUser, attach_poster, complete_poster_upload,
    create_poster_upload, remove_poster, router,
)
from events.models.domain import Event
from events.schemas import EventSchema
from feed.models.domain import LinkedEvent, NearbyEvent
from feed.schemas import LinkedEventSchema, NearbyEventSchema
from images.models.domain import ImageAsset
from images.ports import ImageTransaction
from images.processing import MAX_BYTES, MAX_PIXELS, process_image
from images.schemas import PosterAttachRequest, PosterUploadRequest
from images.service import PosterEvent, PosterService
from images.storage import (
    DISPLAY_BUCKET, ORIGINALS_BUCKET, PosterUnavailableError, StorageError, SupabasePosterStorage,
)
from shared.auth.models import AuthenticatedUser
from shared.errors import ConflictError, NotFoundError, PermissionDeniedError, ValidationFailedError

USER = AuthenticatedUser(user_id='venue', email=None, role='venue')
NOW = datetime.now(timezone.utc)


def image_bytes(fmt='PNG', size=(24, 32), mode='RGB', **kwargs):
    output = BytesIO()
    Image.new(mode, size, 'red').save(output, format=fmt, **kwargs)
    return output.getvalue()


class FakeImages:
    def __init__(self):
        self.assets = {}
        self.lock = RLock()
        self.events = None

    def create(self, asset):
        self.assets[asset.id] = deepcopy(asset)

    @contextmanager
    def locked(self, asset_id):
        with self.lock:
            asset = deepcopy(self.assets.get(asset_id))
            yield ImageTransaction(asset, self.events)
            if asset is not None:
                self.assets[asset_id] = deepcopy(asset)

    def cleanup_candidates(self, before, limit):
        return list(self.assets)[:limit]


class FakeStorage:
    upload_url = 'https://project.storage.supabase.co/storage/v1/upload/resumable/sign'

    def __init__(self):
        self.objects = {}
        self.deleted = []
        self.fail_put = None
        self.fail_delete = False
        self.puts = []

    def sign_upload(self, key):
        return 'path-signed-capability'

    def read(self, bucket, key, *, limit):
        data = self.objects.get((bucket, key))
        if data is not None and len(data) > limit:
            raise ValidationFailedError('poster exceeds size')
        return data

    def put(self, bucket, key, data, content_type):
        self.puts.append((bucket, key))
        if self.fail_put == bucket:
            raise StorageError('provider write failed')
        previous = self.objects.get((bucket, key))
        if previous is not None and previous != data:
            raise StorageError('immutable conflict')
        self.objects[bucket, key] = data

    def delete(self, bucket, keys):
        if self.fail_delete:
            raise StorageError('provider deletion failed')
        for key in keys:
            self.deleted.append((bucket, key))
            self.objects.pop((bucket, key), None)

    def public_url(self, key):
        return 'https://project.supabase.co/storage/v1/object/public/' + DISPLAY_BUCKET + '/' + key


class FakeEvents:
    def __init__(self, images):
        self.images = images
        images.events = self
        self.events = {'gig': PosterEvent('gig', USER.user_id, None, 0)}
        self.fail_swap = False
        self.lock = RLock()

    def get(self, event_id):
        return self.events.get(event_id)

    def referenced(self, asset_id):
        return any(event.asset_id == asset_id for event in self.events.values())

    def swap(self, event_id, owner_id, expected_revision, asset, url):
        with self.lock:
            event = self.events.get(event_id)
            if (
                self.fail_swap or event is None or event.owner_id != owner_id
                or event.revision != expected_revision
            ):
                raise ConflictError('poster changed')
            if event.asset_id:
                previous = self.images.assets[event.asset_id]
                previous.status = 'retired'
                previous.touched_at = datetime.now(timezone.utc)
            self.events[event_id] = replace(
                event, asset_id=asset.id if asset else None, revision=event.revision + 1,
            )


def setup_service(*, enabled=True):
    images, storage = FakeImages(), FakeStorage()
    events = FakeEvents(images)
    return PosterService(images, storage, events, enabled=enabled), images, storage, events


def upload(service, storage, data=None, content_type='image/png'):
    data = image_bytes() if data is None else data
    intent = service.initiate('gig', USER, content_type, len(data))
    storage.objects[ORIGINALS_BUCKET, intent.object_name] = data
    return intent


def ready(service, storage):
    intent = upload(service, storage)
    assert service.complete('gig', intent.asset_id, USER) == (24, 32)
    return intent


def age(images):
    for asset in images.assets.values():
        asset.touched_at = NOW - timedelta(hours=25)
        asset.expires_at = NOW - timedelta(hours=1)


def test_complete_is_private_metadata_free_and_idempotent():
    service, images, storage, _ = setup_service()
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text('location', 'secret GPS')
    intent = upload(service, storage, image_bytes(pnginfo=metadata))
    assert service.complete('gig', intent.asset_id, USER) == (24, 32)
    asset = images.assets[intent.asset_id]
    assert asset.status == 'ready'
    assert not any(bucket == DISPLAY_BUCKET for bucket, _ in storage.objects)
    assert storage.objects[ORIGINALS_BUCKET, asset.upload_key]  # token path remains occupied
    prepared = storage.objects[ORIGINALS_BUCKET, asset.prepared_key]
    with Image.open(BytesIO(prepared)) as image:
        assert image.getexif() == {}
        assert not {'location', 'exif', 'icc_profile', 'comment'} & image.info.keys()
    puts = list(storage.puts)
    assert service.complete('gig', intent.asset_id, USER) == (24, 32)
    assert storage.puts == puts


def test_completion_retry_recovers_private_storage_failure():
    service, images, storage, _ = setup_service()
    intent = upload(service, storage)
    storage.fail_put = ORIGINALS_BUCKET
    with pytest.raises(StorageError):
        service.complete('gig', intent.asset_id, USER)
    assert images.assets[intent.asset_id].status == 'uploading'
    storage.fail_put = None
    assert service.complete('gig', intent.asset_id, USER) == (24, 32)


@pytest.mark.parametrize('data,content_type', [
    (b'invalid pixels', 'image/png'),
    (b'<svg></svg>', 'image/png'),
    (image_bytes('JPEG'), 'image/png'),
    (image_bytes('GIF'), 'image/png'),
])
def test_rejected_bytes_fail_durably_without_publication(data, content_type):
    service, images, storage, _ = setup_service()
    intent = upload(service, storage, data, content_type)
    with pytest.raises(ValidationFailedError):
        service.complete('gig', intent.asset_id, USER)
    assert images.assets[intent.asset_id].status == 'failed'
    assert not any(bucket == DISPLAY_BUCKET for bucket, _ in storage.objects)


def test_pending_completion_is_retryable_and_expiry_is_explicit():
    service, images, _, _ = setup_service()
    intent = service.initiate('gig', USER, 'image/png', 20)
    with pytest.raises(ConflictError, match='not finished'):
        service.complete('gig', intent.asset_id, USER)
    images.assets[intent.asset_id].expires_at = NOW - timedelta(seconds=1)
    with pytest.raises(ConflictError, match='expired'):
        service.complete('gig', intent.asset_id, USER)


@pytest.mark.parametrize('method', ['initiate', 'complete', 'attach', 'remove'])
def test_every_mutation_denies_disabled_and_unconfigured(method):
    for service in (
        setup_service(enabled=False)[0],
        PosterService(None, None, FakeEvents(FakeImages()), enabled=True),
    ):
        args = {
            'initiate': ('gig', USER, 'image/png', 10),
            'complete': ('gig', 'asset', USER),
            'attach': ('gig', 'asset', 0, USER),
            'remove': ('gig', 0, USER),
        }[method]
        with pytest.raises(PosterUnavailableError):
            getattr(service, method)(*args)


@pytest.mark.parametrize('user', [
    replace(USER, user_id='other'), replace(USER, role='fan'), replace(USER, role='comedian'),
])
def test_owner_and_role_checked_on_every_action(user):
    service, _, storage, _ = setup_service()
    intent = ready(service, storage)
    for method, args in [
        ('initiate', ('gig', user, 'image/png', 10)),
        ('complete', ('gig', intent.asset_id, user)),
        ('attach', ('gig', intent.asset_id, 0, user)),
        ('remove', ('gig', 0, user)),
    ]:
        with pytest.raises(PermissionDeniedError):
            getattr(service, method)(*args)


@pytest.mark.parametrize('field,value', [
    ('owner_id', 'other'), ('event_id', 'other-gig'), ('purpose', 'avatar'),
])
def test_asset_owner_event_and_purpose_rechecked(field, value):
    service, images, storage, _ = setup_service()
    intent = ready(service, storage)
    setattr(images.assets[intent.asset_id], field, value)
    with pytest.raises(PermissionDeniedError):
        service.attach('gig', intent.asset_id, 0, USER)
    with pytest.raises(PermissionDeniedError):
        service.complete('gig', intent.asset_id, USER)


def test_missing_event_and_asset_are_not_success_shaped():
    service, _, _, _ = setup_service()
    with pytest.raises(NotFoundError):
        service.initiate('absent', USER, 'image/png', 10)
    with pytest.raises(NotFoundError):
        service.complete('gig', 'absent', USER)


def test_attach_replace_remove_and_stale_success_replay():
    service, images, storage, events = setup_service()
    first, second = ready(service, storage), ready(service, storage)
    service.attach('gig', first.asset_id, 0, USER)
    service.attach('gig', first.asset_id, 0, USER)
    assert events.events['gig'].revision == 1
    storage.fail_put = DISPLAY_BUCKET
    with pytest.raises(StorageError):
        service.attach('gig', second.asset_id, 1, USER)
    assert events.events['gig'].asset_id == first.asset_id
    storage.fail_put = None
    service.attach('gig', second.asset_id, 1, USER)
    assert images.assets[first.asset_id].status == 'retired'
    assert events.events['gig'].revision == 2
    with pytest.raises(ConflictError):
        service.remove('gig', 1, USER)
    assert events.events['gig'].asset_id == second.asset_id
    service.remove('gig', 2, USER)
    assert events.events['gig'].asset_id is None
    assert events.events['gig'].revision == 3
    with pytest.raises(ConflictError):
        service.attach('gig', second.asset_id, 1, USER)
    assert storage.objects[DISPLAY_BUCKET, images.assets[second.asset_id].display_key]


def test_failed_cas_retains_old_and_tracks_unreferenced_output():
    service, images, storage, events = setup_service()
    first = ready(service, storage)
    service.attach('gig', first.asset_id, 0, USER)
    second = ready(service, storage)
    events.fail_swap = True
    with pytest.raises(ConflictError):
        service.attach('gig', second.asset_id, 1, USER)
    assert events.events['gig'].asset_id == first.asset_id
    assert images.assets[second.asset_id].status == 'ready'
    assert (DISPLAY_BUCKET, images.assets[second.asset_id].display_key) in storage.objects
    age(images)
    assert service.cleanup(dry_run=False) == (1, 0)
    assert (DISPLAY_BUCKET, images.assets[first.asset_id].display_key) in storage.objects


def test_publication_failure_refreshes_orphan_grace_and_failed_removal_retains_reference():
    service, images, storage, events = setup_service()
    first = ready(service, storage)
    service.attach('gig', first.asset_id, 0, USER)
    second = ready(service, storage)
    age(images)
    events.fail_swap = True
    with pytest.raises(ConflictError):
        service.attach('gig', second.asset_id, 1, USER)
    assert images.assets[second.asset_id].touched_at > NOW - timedelta(minutes=1)
    assert service.cleanup(dry_run=False) == (0, 0)
    with pytest.raises(ConflictError):
        service.remove('gig', 1, USER)
    assert events.events['gig'].asset_id == first.asset_id


def test_publication_lease_is_durable_even_if_storage_process_crashes(monkeypatch):
    service, images, storage, _ = setup_service()
    intent = ready(service, storage)
    age(images)

    def crash(*args):
        assert images.assets[intent.asset_id].touched_at > NOW - timedelta(minutes=1)
        raise RuntimeError('simulated process crash')

    monkeypatch.setattr(storage, 'put', crash)
    with pytest.raises(RuntimeError, match='process crash'):
        service.attach('gig', intent.asset_id, 0, USER)
    assert service.cleanup(dry_run=False) == (0, 0)


def test_publication_crash_is_retryable_when_cas_already_committed():
    service, images, storage, events = setup_service()
    intent = ready(service, storage)
    service.attach('gig', intent.asset_id, 0, USER)
    # Crash between the owning event transaction and image transaction.
    images.assets[intent.asset_id].status = 'ready'
    service.attach('gig', intent.asset_id, 0, USER)
    assert events.events['gig'].revision == 1
    age(images)
    assert service.cleanup(dry_run=False) == (0, 0)


def test_concurrent_attachments_have_one_winner_and_completion_is_serialized():
    service, images, storage, events = setup_service()
    first = upload(service, storage)
    with ThreadPoolExecutor(max_workers=2) as pool:
        assert list(pool.map(
            lambda _: service.complete('gig', first.asset_id, USER), range(2),
        )) == [(24, 32), (24, 32)]
    second = ready(service, storage)

    def attach(intent):
        try:
            service.attach('gig', intent.asset_id, 0, USER)
            return True
        except ConflictError:
            return False

    with ThreadPoolExecutor(max_workers=2) as pool:
        assert sorted(pool.map(attach, (first, second))) == [False, True]
    assert events.events['gig'].revision == 1
    assert sum(asset.status == 'attached' for asset in images.assets.values()) == 1


def test_cleanup_dry_run_expiry_reference_grace_and_retries_on_rollback():
    service, images, storage, events = setup_service()
    attached = ready(service, storage)
    abandoned = upload(service, storage)
    service.attach('gig', attached.asset_id, 0, USER)
    age(images)
    service.enabled = False
    assert service.cleanup() == (1, 0)
    assert images.assets[abandoned.asset_id].status == 'uploading'
    storage.fail_delete = True
    assert service.cleanup(dry_run=False) == (0, 1)
    storage.fail_delete = False
    images.assets[abandoned.asset_id].expires_at = NOW + timedelta(hours=1)
    assert service.cleanup(dry_run=False) == (0, 0)
    images.assets[abandoned.asset_id].expires_at = NOW - timedelta(hours=1)
    assert service.cleanup(dry_run=False) == (1, 0)
    assert images.assets[abandoned.asset_id].status == 'deleted'
    assert events.events['gig'].asset_id == attached.asset_id
    assert not any(key == images.assets[attached.asset_id].display_key for _, key in storage.deleted)


def test_abandoned_cleanup_waits_for_signed_capability_plus_tus_session_window():
    service, images, storage, _ = setup_service()
    intent = upload(service, storage)
    asset = images.assets[intent.asset_id]
    assert asset.expires_at >= asset.created_at + timedelta(hours=26)
    asset.touched_at = NOW - timedelta(hours=25)
    # 24h abandonment grace alone does not let cleanup remove a live TUS path.
    asset.expires_at = NOW + timedelta(hours=1)
    assert service.cleanup(dry_run=False) == (0, 0)


def test_deleted_event_reconciles_retained_image_record():
    service, images, storage, events = setup_service()
    intent = ready(service, storage)
    service.attach('gig', intent.asset_id, 0, USER)
    events.events.clear()
    age(images)
    assert service.cleanup(dry_run=False) == (1, 0)
    assert images.assets[intent.asset_id].status == 'deleted'


@pytest.mark.parametrize('content_type,size', [
    ('image/svg+xml', 10), ('image/heic', 10), ('image/png', 0), ('image/png', MAX_BYTES + 1),
])
def test_request_and_service_reject_unsupported_type_and_size(content_type, size):
    with pytest.raises(ValidationError):
        PosterUploadRequest(contentType=content_type, fileSize=size)
    with pytest.raises(ValidationFailedError):
        setup_service()[0].initiate('gig', USER, content_type, size)


def test_image_limits_transparency_orientation_and_metadata():
    png = image_bytes(size=(4096, 2048), mode='RGBA')
    processed = process_image(png, 'image/png', len(png))
    assert (processed.width, processed.height, processed.content_type) == (2048, 1024, 'image/png')
    with Image.open(BytesIO(processed.data)) as result:
        assert result.mode == 'RGBA'
    exif = Image.Exif()
    exif[274] = 6
    exif[270] = 'private location'
    jpeg = image_bytes('JPEG', size=(60, 30), exif=exif)
    processed = process_image(jpeg, 'image/jpeg', len(jpeg))
    assert (processed.width, processed.height) == (30, 60)
    with Image.open(BytesIO(processed.data)) as result:
        assert not result.getexif()
    with pytest.raises(ValidationFailedError):
        process_image(jpeg, 'image/jpeg', len(jpeg) + 1)
    with pytest.raises(ValidationFailedError):
        process_image(b'0' * (MAX_BYTES + 1), 'image/jpeg', MAX_BYTES + 1)
    oversized = image_bytes(size=(5001, 5000))
    assert 5001 * 5000 > MAX_PIXELS
    with pytest.raises(ValidationFailedError, match='megapixels'):
        process_image(oversized, 'image/png', len(oversized))
    output = BytesIO()
    Image.new('RGB', (10, 10), 'red').save(
        output, format='PNG', save_all=True,
        append_images=[Image.new('RGB', (10, 10), 'blue')],
    )
    with pytest.raises(ValidationFailedError, match='animated'):
        process_image(output.getvalue(), 'image/png', len(output.getvalue()))


def test_webp_input_and_bounded_decoder_capacity():
    from images import processing

    data = image_bytes('WEBP')
    assert process_image(data, 'image/webp', len(data)).content_type == 'image/jpeg'
    assert processing._DECODERS.acquire(False)
    assert processing._DECODERS.acquire(False)
    try:
        with pytest.raises(PosterUnavailableError, match='busy'):
            process_image(data, 'image/webp', len(data))
    finally:
        processing._DECODERS.release()
        processing._DECODERS.release()


def test_public_contract_has_only_display_fields_and_old_defaults():
    event = Event('gig', 'venue', 'Comedy', NOW)
    old = EventSchema.from_domain(event)
    assert (old.posterUrl, old.posterRevision, old.posterWidth, old.posterHeight) == (None, 0, None, None)
    public = replace(event, poster_asset_id='private-asset-id', poster_url='https://public/poster',
                     poster_width=24, poster_height=32, poster_revision=3)
    wire = EventSchema.from_domain(public).model_dump()
    assert wire['posterUrl'] == 'https://public/poster'
    assert not {'posterAssetId', 'originalKey', 'uploadToken', 'preparedKey'} & wire.keys()
    linked = LinkedEvent('gig', 'Comedy', NOW, 'venue', poster_url=public.poster_url,
                         poster_width=24, poster_height=32)
    nearby = NearbyEvent('gig', 'Comedy', NOW, 'venue', 'Venue', poster_url=public.poster_url,
                         poster_width=24, poster_height=32)
    for schema, domain in ((LinkedEventSchema, linked), (NearbyEventSchema, nearby)):
        result = schema.from_domain(domain)
        assert (result.posterUrl, result.posterWidth, result.posterHeight) == (public.poster_url, 24, 32)


def test_home_assembly_projects_poster_from_real_event_domain():
    from tests.test_feed import FakeEventsLookup, FakeFeedRepository, _service

    event = Event('gig', 'venue', 'Comedy', NOW, poster_url='https://public/poster',
                  poster_width=24, poster_height=32)
    repository = FakeFeedRepository()
    service = _service(repository)
    service._events = FakeEventsLookup([event])
    projected = service.home_feed('viewer', lat=51.5, lng=-0.1).nearby_events[0]
    assert (projected.poster_url, projected.poster_width, projected.poster_height) == (
        'https://public/poster', 24, 32,
    )


def test_routes_are_owner_scoped_rate_limited_and_config_precedes_parameter_route():
    paths = [route.path for route in router.routes]
    assert paths.index('/events/poster-config') < paths.index('/events/{event_id}')
    for handler in (create_poster_upload, complete_poster_upload, attach_poster, remove_poster):
        assert get_type_hints(handler, include_extras=True)['user'] == VenueUser
        assert handler.__defaults__[-1] is PosterWriteRateLimit
    with pytest.raises(ValidationError):
        PosterAttachRequest(assetId='asset', expectedRevision=-1)
    with pytest.raises(ValidationError):
        PosterAttachRequest(assetId='asset', expectedRevision=True)


def response(status=200, **payload):
    result = Mock(status_code=status)
    result.json.return_value = payload
    return result


def test_supabase_sign_route_non_upsert_and_direct_tus_endpoint(monkeypatch):
    request = Mock(return_value=response(url='/object/upload/sign/bucket/key?token=scoped'))
    monkeypatch.setattr('images.storage.requests.request', request)
    storage = SupabasePosterStorage('https://project.supabase.co', 'backend-only-key')
    assert storage.sign_upload('uploads/owner/event/asset') == 'scoped'
    assert storage.upload_url == 'https://project.storage.supabase.co/storage/v1/upload/resumable/sign'
    args, kwargs = request.call_args
    assert args == ('POST', 'https://project.supabase.co/storage/v1/object/upload/sign/'
                    'gig-poster-originals/uploads/owner/event/asset')
    assert kwargs['headers']['x-upsert'] == 'false'
    assert kwargs['headers']['Authorization'] == 'Bearer backend-only-key'
    assert kwargs['allow_redirects'] is False
    assert 'backend-only-key' not in storage.upload_url


def test_supabase_retries_are_immutable_and_unknown_errors_are_not_missing(monkeypatch):
    request = Mock(return_value=response(400, error='Duplicate'))
    monkeypatch.setattr('images.storage.requests.request', request)
    storage = SupabasePosterStorage('https://project.supabase.co', 'key')
    monkeypatch.setattr(storage, 'read', lambda *a, **kw: b'pixels')
    storage.put(DISPLAY_BUCKET, 'key', b'pixels', 'image/jpeg')
    with pytest.raises(StorageError):
        storage.put(DISPLAY_BUCKET, 'key', b'different', 'image/jpeg')
    monkeypatch.undo()
    request = Mock(return_value=response(400, error='AccessDenied'))
    monkeypatch.setattr('images.storage.requests.request', request)
    storage = SupabasePosterStorage('https://project.supabase.co', 'key')
    with pytest.raises(StorageError):
        storage.read(ORIGINALS_BUCKET, 'key', limit=10)
    request.return_value = response(404)
    assert storage.read(ORIGINALS_BUCKET, 'missing', limit=10) is None


def test_supabase_bounded_download_and_malformed_signed_response(monkeypatch):
    result = response()
    result.iter_content.return_value = iter([b'1234', b'5678'])
    request = Mock(return_value=result)
    monkeypatch.setattr('images.storage.requests.request', request)
    storage = SupabasePosterStorage('https://project.supabase.co', 'key')
    with pytest.raises(ValidationFailedError):
        storage.read(ORIGINALS_BUCKET, 'key', limit=6)
    result.close.assert_called_once()
    request.return_value = response(url='no-token')
    with pytest.raises(StorageError):
        storage.sign_upload('key')
