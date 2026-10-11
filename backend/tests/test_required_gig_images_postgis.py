"""Opt-in contracts on a NEW disposable local PostGIS database, never runtime settings.

CI must create an empty database named comedy_required_images_test (or that prefix
with a suffix), then set REQUIRED_GIG_IMAGES_TEST_DATABASE_URL and
REQUIRED_GIG_IMAGES_DISPOSABLE_DATABASE=1. This suite applies 0010, seeds legacy
records, then migrates to head. It never drops an existing database or table.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
from uuid import uuid4

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import create_engine, event as sqlalchemy_event, inspect, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import sessionmaker

from events.models.domain import EventPublicationStatus
from events.models.orm import EventRow
from events.repository import SqlEventRepository
from events.service import EventService
from images.factory import RepositoryPosterEvents
from images.models.orm import ImageAssetRow
from images.repository import SqlImageRepository
from images.service import PosterService
from images.storage import DISPLAY_BUCKET, PosterUnavailableError
from shared.auth.models import AuthenticatedUser
from shared.errors import ConflictError, NotFoundError
from tests.test_events import FakeComedianLookup, FakePlaceLookup
from tests.test_gig_posters import FakeStorage, image_bytes
from tests.test_native_events import FakeVenueLookup, VENUE


def disposable_url(url, confirmation):
    """Reject unsafe targets before opening a connection; never use runtime settings."""
    if confirmation != '1':
        raise ValueError('explicit disposable database confirmation is required')
    if not url:
        raise ValueError('explicit disposable database URL is required')
    parsed = make_url(url)
    if (
        parsed.get_backend_name() != 'postgresql'
        or parsed.host not in ('localhost', '127.0.0.1', '::1')
        or not parsed.database
        or not (
            parsed.database == 'comedy_required_images_test'
            or parsed.database.startswith('comedy_required_images_test_')
        )
        or parsed.query
    ):
        raise ValueError('use a new dedicated local comedy_required_images_test database without options')
    return parsed.set(drivername='postgresql+psycopg')


@dataclass
class MigratedDatabase:
    sessions: sessionmaker
    owner: str
    missing: str
    valid: str
    invalid: list[str]
    legacy_key: str


@pytest.fixture(scope='module')
def postgis():
    raw_url = os.environ.get('REQUIRED_GIG_IMAGES_TEST_DATABASE_URL')
    confirmation = os.environ.get('REQUIRED_GIG_IMAGES_DISPOSABLE_DATABASE')
    if raw_url is None and confirmation is None:
        pytest.skip('opt-in disposable PostGIS database is not configured')
    url = disposable_url(raw_url or '', confirmation)
    engine = create_engine(url)
    try:
        # PostGIS base tables are allowed on a freshly created PostGIS-template DB.
        inspector = inspect(engine)
        existing = (
            set(inspector.get_table_names(schema='public')) - {'spatial_ref_sys'}
        ) | (
            set(inspector.get_view_names(schema='public')) - {'geometry_columns', 'geography_columns'}
        ) | set(inspector.get_materialized_view_names(schema='public'))
        with engine.connect() as connection:
            other_tables = connection.execute(text("""
                SELECT schemaname, tablename FROM pg_tables
                WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'public')
            """)).all()
        if existing or other_tables:
            pytest.fail('refusing to migrate a nonempty disposable database')

        # Alembic uses settings in env.py; temporarily point ONLY this explicit invocation
        # to the validated URL, without falling back to DISCOVERY_DATABASE_URL/.env.
        from shared.config import settings

        config = Config(str(Path(__file__).parents[1] / 'alembic.ini'))
        config.set_main_option('script_location', str(Path(__file__).parents[1] / 'alembic'))
        original_url = settings.database_url
        owner, missing, valid = (str(uuid4()) for _ in range(3))
        legacy_key = str(uuid4())
        invalid = []
        try:
            settings.database_url = url.render_as_string(hide_password=False)
            command.upgrade(config, '0010_gig_posters')
            with engine.begin() as connection:
                connection.execute(text("""
                    INSERT INTO venue_profiles (user_id, venue_name, address, latitude, longitude)
                    VALUES (:owner, 'Migration Venue', '1 Comedy St', 51.5, -0.1)
                """), {'owner': owner})
                connection.execute(text("""
                    INSERT INTO events (id, venue_id, title, description, start_time, status)
                    VALUES (:id, :owner, 'Preserved no-image gig', 'Original data',
                            now() + interval '1 day', 'scheduled')
                """), {'id': missing, 'owner': owner})
                legacy_hash = sha256(json.dumps({
                    'title': 'Preserved no-image gig', 'description': 'Original data',
                    'localStartTime': '2099-01-01T20:00', 'localEndTime': None,
                    'timeZone': 'UTC', 'ticketUrl': None,
                }, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
                connection.execute(text("""
                    INSERT INTO native_event_submissions (owner_id, key, payload_hash, event_id)
                    VALUES (:owner, :key, :hash, :event)
                """), {'owner': owner, 'key': legacy_key, 'hash': legacy_hash, 'event': missing})
                for kind in ('valid', 'foreign_owner', 'wrong_event', 'unattached',
                             'missing_asset', 'blank_url', 'bad_dimensions'):
                    event_id = valid if kind == 'valid' else str(uuid4())
                    if kind != 'valid':
                        invalid.append(event_id)
                    asset_id = str(uuid4())
                    parameters = {
                        'event_id': event_id, 'asset_id': asset_id, 'owner': owner,
                        'asset_owner': str(uuid4()) if kind == 'foreign_owner' else owner,
                        'asset_event': str(uuid4()) if kind == 'wrong_event' else event_id,
                        'status': 'ready' if kind == 'unattached' else 'attached',
                        'url': '  ' if kind == 'blank_url' else 'https://public.example/poster',
                        'width': 0 if kind == 'bad_dimensions' else 24,
                    }
                    connection.execute(text("""
                        INSERT INTO events (
                            id, venue_id, title, start_time, status, poster_asset_id,
                            poster_url, poster_width, poster_height
                        ) VALUES (
                            :event_id, :owner, 'Preserved with reference',
                            now() + interval '1 day', 'cancelled', :asset_id, :url, :width, 32
                        )
                    """), parameters)
                    if kind != 'missing_asset':
                        connection.execute(text("""
                            INSERT INTO image_assets (
                                id, owner_id, event_id, purpose, status, content_type, file_size,
                                upload_key, original_key, prepared_key, display_key,
                                output_type, width, height, created_at, touched_at, expires_at
                            ) VALUES (
                                CAST(:asset_id AS uuid), :asset_owner, :asset_event, 'gig-poster', :status,
                                'image/png', 100, 'uploads/' || :asset_id,
                                'sealed/' || :asset_id, 'prepared/' || :asset_id,
                                'posters/' || :asset_id, 'image/png', 24, 32,
                                now(), now(), now() + interval '26 hours'
                            )
                        """), parameters)
            command.upgrade(config, 'head')
        finally:
            settings.database_url = original_url
        yield MigratedDatabase(sessionmaker(engine), owner, missing, valid, invalid, legacy_key)
    finally:
        engine.dispose()


def test_postgis_0010_backfill_preserves_ids_schedule_data_and_owner_privacy(postgis):
    repository = SqlEventRepository(postgis.sessions)
    service = EventService(repository, FakeComedianLookup(set()), FakePlaceLookup())
    owner = AuthenticatedUser(postgis.owner, None, 'venue')
    missing = repository.get(postgis.missing)
    assert missing.publication_status is EventPublicationStatus.DRAFT
    assert missing.status.value == 'scheduled'
    assert (missing.title, missing.description) == ('Preserved no-image gig', 'Original data')
    valid = service.get(postgis.valid)
    assert valid.publication_status is EventPublicationStatus.PUBLISHED
    assert valid.status.value == 'cancelled'
    assert valid.poster_url and (valid.poster_width, valid.poster_height) == (24, 32)
    for event_id in [postgis.missing, *postgis.invalid]:
        assert repository.get(event_id).publication_status is EventPublicationStatus.DRAFT
        with pytest.raises(NotFoundError):
            service.get(event_id)
        assert service.get(event_id, owner).id == event_id
    assert {item.id for item in service.list_owned(owner)} >= {postgis.missing, *postgis.invalid}
    public_ids = {item.id for item in service.list_by_venue(postgis.owner, upcoming_only=False)}
    assert postgis.valid in public_ids
    assert not public_ids.intersection({postgis.missing, *postgis.invalid})
    legacy_arguments = {
        'title': 'Preserved no-image gig', 'description': 'Original data',
        'local_start_time': '2099-01-01T20:00', 'time_zone': 'UTC',
        'idempotency_key': postgis.legacy_key,
    }
    assert service.create_native_draft(owner, **legacy_arguments).id == postgis.missing
    with pytest.raises(ConflictError, match='update required'):
        service.create_native(owner, **legacy_arguments)


@pytest.mark.parametrize('statement', [
    "UPDATE events SET publication_status = 'published' WHERE id = :id",
    "UPDATE events SET publication_status = 'published', poster_asset_id = :asset, "
    "poster_url = 'https://public.example/image', poster_width = NULL, poster_height = 32 WHERE id = :id",
    "UPDATE events SET publication_status = 'published', poster_asset_id = :asset, "
    "poster_url = '  ', poster_width = 24, poster_height = 32 WHERE id = :id",
])
def test_postgis_sql_rejects_incomplete_publication(postgis, statement):
    with postgis.sessions() as session:
        with pytest.raises(IntegrityError) as error:
            session.execute(text(statement), {'id': postgis.missing, 'asset': str(uuid4())})
            session.commit()
        assert error.value.orig.diag.constraint_name == 'events_published_image_check'
        session.rollback()
        assert session.get(EventRow, postgis.missing).publication_status == 'draft'


@pytest.mark.parametrize('assignment', [
    'poster_asset_id = NULL', 'poster_url = NULL', "poster_url = ''",
    'poster_width = NULL', 'poster_width = 0', 'poster_height = NULL', 'poster_height = -1',
])
def test_postgis_sql_rejects_sole_image_removal(postgis, assignment):
    with postgis.sessions() as session:
        with pytest.raises(IntegrityError) as error:
            session.execute(text(f'UPDATE events SET {assignment} WHERE id = :id'),
                            {'id': postgis.valid})
            session.commit()
        assert error.value.orig.diag.constraint_name == 'events_published_image_check'
        session.rollback()
        assert session.get(EventRow, postgis.valid).publication_status == 'published'


def test_postgis_new_event_database_default_is_private(postgis):
    event_id = str(uuid4())
    with postgis.sessions() as session:
        session.execute(text("""
            INSERT INTO events (id, venue_id, title, start_time)
            VALUES (:id, :owner, 'Default draft', now() + interval '1 day')
        """), {'id': event_id, 'owner': postgis.owner})
        session.commit()
        assert session.get(EventRow, event_id).publication_status == 'draft'


def test_postgis_finalizer_fault_commit_visibility_and_elapsed_replay(postgis):
    repository = SqlEventRepository(postgis.sessions)
    service = EventService(
        repository, FakeComedianLookup(set()), FakePlaceLookup(), venues=FakeVenueLookup(VENUE),
    )
    user = AuthenticatedUser(postgis.owner, None, 'venue')
    key = str(uuid4())
    arguments = dict(title='Finalized Comedy', local_start_time='2099-01-01T20:00', time_zone='UTC')
    draft = service.create_native_draft(user, **arguments, idempotency_key=key)
    assert service.create_native_draft(user, **arguments, idempotency_key=key).id == draft.id
    images = SqlImageRepository(
        postgis.sessions, lambda session: RepositoryPosterEvents(repository, session=session),
    )
    storage = FakeStorage()
    posters = PosterService(images, storage, RepositoryPosterEvents(repository))
    data = image_bytes()
    intent = posters.initiate(draft.id, user, 'image/png', len(data))
    storage.objects[intent.bucket_name, intent.object_name] = data
    posters.complete(draft.id, intent.asset_id, user)

    original_put = storage.put

    def put_observing_committed_state(bucket, *args):
        if bucket == DISPLAY_BUCKET:
            # Storage processing must not expose a half-finalized event to another session.
            with postgis.sessions() as observer:
                assert observer.get(EventRow, draft.id).publication_status == 'draft'
                assert observer.get(ImageAssetRow, intent.asset_id).status == 'ready'
        return original_put(bucket, *args)

    storage.put = put_observing_committed_state
    storage.fail_put = DISPLAY_BUCKET
    with pytest.raises(PosterUnavailableError):
        posters.publish(draft.id, intent.asset_id, 0, user)
    storage.fail_put = None

    def fail_final_commit(session):
        if any(isinstance(row, ImageAssetRow) and row.status == 'attached' for row in session.dirty):
            raise OperationalError('simulated final commit', None, RuntimeError('injected DB failure'))

    sqlalchemy_event.listen(postgis.sessions, 'before_commit', fail_final_commit)
    try:
        with pytest.raises(PosterUnavailableError):
            posters.publish(draft.id, intent.asset_id, 0, user)
    finally:
        sqlalchemy_event.remove(postgis.sessions, 'before_commit', fail_final_commit)
    with postgis.sessions() as session:
        event = session.get(EventRow, draft.id)
        assert (event.publication_status, event.poster_asset_id, event.poster_revision) == ('draft', None, 0)
        assert session.get(ImageAssetRow, intent.asset_id).status == 'ready'
    with pytest.raises(NotFoundError):
        service.get(draft.id)

    posters.publish(draft.id, intent.asset_id, 0, user)
    with postgis.sessions() as session:
        event = session.get(EventRow, draft.id)
        assert (event.publication_status, event.poster_asset_id, event.poster_revision) == (
            'published', intent.asset_id, 1,
        )
        assert session.get(ImageAssetRow, intent.asset_id).status == 'attached'
        event.start_time = datetime.now(timezone.utc) - timedelta(days=1)
        session.commit()
    storage.put = original_put
    writes = list(storage.puts)
    storage.fail_put = DISPLAY_BUCKET
    posters.publish(draft.id, intent.asset_id, 0, user)
    posters.publish(draft.id, intent.asset_id, 1, user)
    assert storage.puts == writes
    assert service.get(draft.id).poster_revision == 1
    assert service.create_native_draft(user, **arguments, idempotency_key=key).id == draft.id
    assert service.create_native(user, **arguments, idempotency_key=key).id == draft.id
    with postgis.sessions() as session:
        assert len(session.scalars(select(EventRow).where(EventRow.id == draft.id)).all()) == 1


@pytest.mark.parametrize('url,confirmation', [
    ('postgresql://localhost/comedy_required_images_test', None),
    ('', '1'),
    ('postgresql://localhost/platform', '1'),
    ('postgresql://production.example/comedy_required_images_test', '1'),
    ('postgresql://localhost/comedy_required_images_test?options=-csearch_path=public', '1'),
])
def test_disposable_database_guard_rejects_unsafe_configuration(url, confirmation):
    with pytest.raises(ValueError):
        disposable_url(url, confirmation)


def test_disposable_database_guard_accepts_only_explicit_new_local_target():
    url = disposable_url('postgresql://localhost/comedy_required_images_test_ci', '1')
    assert url.drivername == 'postgresql+psycopg'
    assert url.database == 'comedy_required_images_test_ci'
