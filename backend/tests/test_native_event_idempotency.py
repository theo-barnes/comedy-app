from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import datetime, timezone
from threading import RLock
from uuid import uuid4

import pytest

from events.service import EventService
from shared.errors import ConflictError, ValidationFailedError
from tests.test_events import FakeComedianLookup, FakeEventRepository, FakePlaceLookup
from tests.test_native_events import FakeVenueLookup, USER, VENUE, _publish


class FakeIdempotentEvents(FakeEventRepository):
    def __init__(self):
        super().__init__()
        self.submissions = {}
        self.lock = RLock()

    def get_submission(self, owner_id, key, payload_hash):
        with self.lock:
            previous = self.submissions.get((owner_id, key))
            if previous is None:
                return None
            previous_hash, event = previous
            if previous_hash != payload_hash:
                raise ConflictError('different submission')
            return event

    def create_idempotent(self, event, key, payload_hash):
        with self.lock:
            previous = self.get_submission(event.venue_id, key, payload_hash)
            if previous is not None:
                return previous
            created = self.create(event)
            self.submissions[event.venue_id, key] = payload_hash, created
            return created


def setup():
    repository = FakeIdempotentEvents()
    return EventService(
        repository, FakeComedianLookup(set()), FakePlaceLookup(), venues=FakeVenueLookup(VENUE),
    ), repository


def publish(service, key, **overrides):
    return service.create_native(
        USER, title=overrides.get('title', 'Comedy'), local_start_time='2099-01-01T20:00',
        time_zone='UTC', idempotency_key=key,
    )


def test_same_submission_replays_and_conflicting_payload_does_not_create():
    service, repository = setup()
    key = str(uuid4())
    first = publish(service, key)
    assert publish(service, key) == first
    assert len(repository.submissions) == 1
    with pytest.raises(ConflictError):
        publish(service, key, title='Different')


def test_replay_after_start_elapsed_returns_original_without_rechecking_venue(monkeypatch):
    service, repository = setup()
    key = str(uuid4())
    first = publish(service, key)

    class FutureClock:
        @staticmethod
        def now(tz):
            return datetime(2100, 1, 1, tzinfo=timezone.utc)

    monkeypatch.setattr('events.service.datetime', FutureClock)
    service._venues = FakeVenueLookup(None)
    assert publish(service, key) == first
    assert len(repository.submissions) == 1


def test_concurrent_native_requests_create_exactly_one_gig():
    service, repository = setup()
    key = str(uuid4())
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: publish(service, key), range(8)))
    assert len({event.id for event in results}) == 1
    assert len(repository.submissions) == 1


def test_old_no_header_creation_remains_non_idempotent():
    service, repository = setup()
    assert _publish(service).id != _publish(service).id
    assert repository.submissions == {}


def test_keys_are_uuid_and_owner_scoped():
    service, repository = setup()
    with pytest.raises(ValidationFailedError, match='UUID'):
        publish(service, 'not-a-uuid')
    key = str(uuid4())
    first = publish(service, key)
    other = service.create_native(
        replace(USER, user_id='other-venue'), title='Comedy',
        local_start_time='2099-01-01T20:00', time_zone='UTC', idempotency_key=key,
    )
    assert other.id != first.id
    assert len(repository.submissions) == 2
