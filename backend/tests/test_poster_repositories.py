"""Hand-written SQL session fakes prove transaction/lock boundaries without live DB."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import OperationalError

from events.models.domain import Event
from events.models.orm import EventRow, NativeEventSubmissionRow
from events.repository import SqlEventRepository
from images.factory import RepositoryPosterEvents
from images.models.domain import ImageAsset
from images.models.orm import ImageAssetRow
from images.repository import SqlImageRepository
from images.storage import PosterUnavailableError
from shared.errors import ConflictError

NOW = datetime.now(timezone.utc)


class Result:
    def scalars(self):
        return iter(())


class Session:
    def __init__(self):
        self.rows = {}
        self.added = []
        self.commands = []
        self.commit_count = 0
        self.fail_commit = False
        self.selected = None
        self.query_ids = []

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def get(self, model, identity):
        return self.rows.get((model, identity))

    def add(self, row):
        self.added.append(row)

    def flush(self):
        for row in self.added:
            if isinstance(row, EventRow) and row.id is None:
                row.id = str(uuid4())

    def refresh(self, row):
        pass

    def commit(self):
        if self.fail_commit:
            raise OperationalError('commit', None, RuntimeError('connection failed'))
        self.commit_count += 1

    def execute(self, statement, parameters=None):
        self.commands.append((statement, parameters))
        return Result()

    def scalar(self, statement):
        self.commands.append((statement, None))
        return self.selected

    def scalars(self, statement):
        self.commands.append((statement, None))
        return self.query_ids


def event_row(**overrides):
    return EventRow(
        id='event', venue_id='owner', title='Comedy', start_time=NOW,
        status='scheduled', poster_revision=0, **overrides,
    )


def asset():
    return ImageAsset(
        id='asset', owner_id='owner', event_id='event', purpose='gig-poster',
        status='uploading', content_type='image/png', file_size=10,
        upload_key='upload', original_key='original', prepared_key='prepared', display_key='display',
        created_at=NOW, touched_at=NOW, expires_at=NOW + timedelta(hours=24),
    )


def sql(statement):
    return str(statement.compile(dialect=postgresql.dialect()))


def sql_images(session):
    events = SqlEventRepository(lambda: session)
    return SqlImageRepository(
        lambda: session, lambda current: RepositoryPosterEvents(events, session=current),
    )


def test_idempotent_create_records_event_and_submission_in_one_locked_commit():
    session = Session()
    repository = SqlEventRepository(lambda: session)
    created = repository.create_idempotent(
        Event('', 'owner', 'Comedy', NOW), 'key', 'digest',
    )
    assert session.commit_count == 1
    assert len(session.added) == 2
    event, submission = session.added
    assert isinstance(event, EventRow)
    assert isinstance(submission, NativeEventSubmissionRow)
    assert submission.event_id == event.id == created.id
    assert (submission.owner_id, submission.key, submission.payload_hash) == ('owner', 'key', 'digest')
    statement, parameters = session.commands[0]
    assert 'pg_advisory_xact_lock' in str(statement)
    assert parameters == {'identity': 'native-event:owner:key'}


def test_idempotent_repository_replay_and_conflict_do_not_write():
    session = Session()
    row = event_row()
    session.rows[EventRow, 'event'] = row
    session.rows[NativeEventSubmissionRow, ('owner', 'key')] = NativeEventSubmissionRow(
        owner_id='owner', key='key', payload_hash='digest', event_id='event',
    )
    repository = SqlEventRepository(lambda: session)
    assert repository.create_idempotent(Event('', 'owner', 'Comedy', NOW), 'key', 'digest').id == 'event'
    assert session.added == []
    assert session.commit_count == 0
    with pytest.raises(ConflictError):
        repository.get_submission('owner', 'key', 'different')


def test_create_commit_failure_never_returns_a_success_result():
    session = Session()
    session.fail_commit = True
    with pytest.raises(OperationalError):
        SqlEventRepository(lambda: session).create_idempotent(
            Event('', 'owner', 'Comedy', NOW), 'key', 'digest',
        )


def test_cas_locks_owned_event_and_retires_old_asset_in_same_transaction():
    session = Session()
    row = event_row(poster_asset_id='old')
    session.selected = row
    SqlEventRepository(lambda: session).swap_poster(
        'event', 'owner', 0, 'new', 'https://public/poster', 24, 32,
    )
    assert 'FOR UPDATE' in sql(session.commands[0][0])
    assert row.poster_asset_id == 'new'
    assert row.poster_revision == 1
    assert (row.poster_url, row.poster_width, row.poster_height) == ('https://public/poster', 24, 32)
    retire = session.commands[1][0]
    assert 'UPDATE image_assets' in sql(retire)
    assert retire.compile().params['status'] == 'retired'
    assert session.commit_count == 1


def test_stale_cas_does_not_mutate_or_retire_old_reference():
    session = Session()
    row = event_row(poster_asset_id='old')
    row.poster_revision = 2
    session.selected = row
    with pytest.raises(ConflictError):
        SqlEventRepository(lambda: session).swap_poster('event', 'owner', 1, None, None, None, None)
    assert (row.poster_asset_id, row.poster_revision) == ('old', 2)
    assert session.commit_count == 0
    assert len(session.commands) == 1


def test_bound_cas_refreshes_event_already_read_before_storage_publication():
    cached = event_row()
    current = event_row(poster_asset_id='concurrent-winner')
    current.poster_revision = 1

    class SnapshotSession(Session):
        def scalar(self, statement):
            self.commands.append((statement, None))
            return current if statement.get_execution_options().get('populate_existing') else cached

    session = SnapshotSession()
    session.rows[EventRow, 'event'] = cached
    repository = SqlEventRepository(lambda: session)
    assert repository.get_in_session(session, 'event').poster_revision == 0
    # Another asset attachment commits while this request publishes to Storage.
    with pytest.raises(ConflictError):
        repository.swap_poster_in_session(
            session, 'event', 'owner', 0, 'stale-loser', 'https://public/stale', 24, 32,
        )
    assert (current.poster_asset_id, current.poster_revision) == ('concurrent-winner', 1)
    assert session.commit_count == 0


def test_event_adapter_translates_known_persistence_failure():
    class FailingRepository:
        def swap_poster(self, *args):
            raise OperationalError('update', None, RuntimeError('connection failed'))

    with pytest.raises(PosterUnavailableError):
        RepositoryPosterEvents(FailingRepository()).swap('event', 'owner', 0, None, None)


def test_image_repository_domain_mapping_locks_and_commits_only_after_operation():
    from dataclasses import asdict

    session = Session()
    repository = sql_images(session)
    original = asset()
    repository.create(original)
    assert isinstance(session.added[0], ImageAssetRow)
    row = ImageAssetRow(**asdict(original))
    session.selected = row
    with repository.locked('asset') as transaction:
        locked = transaction.asset
        assert isinstance(locked, ImageAsset)
        assert locked == original
        locked.status = 'ready'
        locked.width, locked.height = 24, 32
        locked.output_type = 'image/jpeg'
        assert session.commit_count == 1
    assert (row.status, row.width, row.height, row.output_type) == ('ready', 24, 32, 'image/jpeg')
    assert session.commit_count == 2
    assert 'FOR UPDATE' in sql(session.commands[0][0])


def test_image_exception_does_not_commit_partial_state():
    from dataclasses import asdict

    session = Session()
    session.selected = ImageAssetRow(**asdict(asset()))
    with pytest.raises(ConflictError):
        with sql_images(session).locked('asset') as transaction:
            locked = transaction.asset
            locked.status = 'deleted'
            raise ConflictError('interrupted')
    assert session.selected.status == 'uploading'
    assert session.commit_count == 0


def test_image_commit_failure_is_explicitly_retryable():
    from dataclasses import asdict

    session = Session()
    session.selected = ImageAssetRow(**asdict(asset()))
    session.fail_commit = True
    with pytest.raises(PosterUnavailableError, match='refresh and retry'):
        with sql_images(session).locked('asset') as transaction:
            locked = transaction.asset
            locked.status = 'ready'


def test_cleanup_query_excludes_active_references_before_limit_to_avoid_starvation():
    session = Session()
    session.query_ids = ['orphan']
    assert sql_images(session).cleanup_candidates(NOW, 100) == ['orphan']
    query = sql(session.commands[0][0])
    assert 'NOT (EXISTS' in query
    assert 'events.poster_asset_id = image_assets.id' in query
    assert 'LIMIT' in query


def test_owned_event_read_mapping_keeps_poster_projection():
    from events.repository import _event_from_row

    row = event_row(poster_url='https://public/poster', poster_width=24, poster_height=32)
    projected = _event_from_row(row, ())
    assert (projected.poster_url, projected.poster_width, projected.poster_height) == (
        'https://public/poster', 24, 32,
    )


def test_linked_feed_hydration_projects_event_poster(monkeypatch):
    from content.models.orm import ContentRow
    from feed import repository as feed_repository

    row = event_row(poster_url='https://public/poster', poster_width=24, poster_height=32)
    content = ContentRow(
        id='content', creator_id='owner', type='event_promotion', title='Comedy',
        event_id='event', published_at=NOW, created_at=NOW,
    )

    class FeedResult:
        def __init__(self, rows):
            self.rows = rows

        def all(self):
            return self.rows

        def scalars(self):
            return iter(self.rows)

    class FeedSession(Session):
        def execute(self, statement, parameters=None):
            if 'FROM events' in sql(statement):
                return FeedResult([row])
            return FeedResult([(content, None)])

    monkeypatch.setattr(feed_repository, '_creator_names', lambda *args: {'owner': 'Venue'})
    monkeypatch.setattr(feed_repository.SqlFeedRepository, '_pair_counts', lambda *args: {})
    monkeypatch.setattr(feed_repository.SqlFeedRepository, '_viewer_pairs', lambda *args: set())
    projected = feed_repository.SqlFeedRepository(lambda: FeedSession()).hydrate(
        ['content'], 'viewer',
    )[0].linked_event
    assert projected is not None
    assert (projected.poster_url, projected.poster_width, projected.poster_height) == (
        'https://public/poster', 24, 32,
    )


@pytest.mark.parametrize('workers', [1, 15])
def test_attachment_does_not_request_nested_pool_connection_under_asset_lock(monkeypatch, workers):
    from concurrent.futures import ThreadPoolExecutor
    from dataclasses import asdict
    from threading import Barrier, Event as Signal, Lock, RLock
    from types import SimpleNamespace

    from sqlalchemy.pool import QueuePool

    from images import factory
    from shared.auth.models import AuthenticatedUser
    from tests.test_gig_posters import FakeStorage

    class Connection:
        def rollback(self):
            pass

        def close(self):
            pass

    pool = QueuePool(Connection, pool_size=workers, max_overflow=0, timeout=0)
    poster = asset()
    poster.status, poster.width, poster.height, poster.output_type = 'ready', 24, 32, 'image/jpeg'
    poster.touched_at = NOW - timedelta(hours=25)
    image = ImageAssetRow(**asdict(poster))
    event = event_row()
    asset_lock, counts_lock = RLock(), Lock()
    all_asset_queries = Signal()
    start = Barrier(workers)
    image_queries = 0
    checkouts = []
    commits = []

    class CheckoutSession(Session):
        def __enter__(self):
            self.connection = pool.connect()
            self.holds_asset = False
            checkouts.append(self)
            return self

        def __exit__(self, *args):
            if self.holds_asset:
                asset_lock.release()
            self.connection.close()
            return False

        def get(self, model, identity):
            assert model is EventRow and identity == 'event'
            return event

        def scalar(self, statement):
            nonlocal image_queries
            model = statement.column_descriptions[0]['entity']
            if model is ImageAssetRow:
                with counts_lock:
                    image_queries += 1
                    if image_queries >= workers:
                        all_asset_queries.set()
                asset_lock.acquire()
                self.holds_asset = True
                # First lock holder proceeds only once every competing caller
                # has checked out a connection and is queued on the same asset.
                assert all_asset_queries.wait(5), 'attachment requests did not reach the lock'
                return image
            assert model is EventRow
            return event

        def commit(self):
            commits.append((image.touched_at, image.status, event.poster_asset_id, event.poster_revision))
            super().commit()

    sessions = lambda: CheckoutSession()
    repository = SqlEventRepository(sessions)
    storage = FakeStorage()
    storage.objects['gig-poster-originals', poster.prepared_key] = b'processed pixels'
    monkeypatch.setattr('shared.database.get_sessionmaker', lambda: sessions)
    monkeypatch.setattr('events.factory.build_repository', lambda: repository)
    monkeypatch.setattr(factory, 'SupabasePosterStorage', lambda *args: storage)
    monkeypatch.setattr('shared.config.settings', SimpleNamespace(
        database_url='configured', supabase_url='https://project.supabase.co',
        supabase_service_role_key='fake-test-key', gig_posters_enabled=True,
    ))
    service = factory.get_service.__wrapped__()
    user = AuthenticatedUser(user_id='owner', email=None, role='venue')

    def attach(_):
        start.wait()
        service.attach('event', 'asset', 0, user)

    with ThreadPoolExecutor(max_workers=workers) as executor:
        list(executor.map(attach, range(workers)))
    assert (event.poster_asset_id, event.poster_revision, image.status) == ('asset', 1, 'attached')
    assert pool.checkedout() == 0
    assert any(
        touched > NOW - timedelta(minutes=1) and reference is None
        for touched, _, reference, _ in commits
    ), 'publication lease must commit before the event reference changes'
    assert all(
        reference is None or status == 'attached' for _, status, reference, _ in commits
    ), 'asset state and event CAS must commit together'
    if workers == 1:
        # Ownership read + independently committed lease + publication/CAS.
        assert len(checkouts) == 3
