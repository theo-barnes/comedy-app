from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from itertools import count
from typing import Any

import pytest

from events.models.domain import Event, EventStatus
from events.service import EventService
from shared.auth.models import AuthenticatedUser
from shared.errors import NotFoundError, PermissionDeniedError, ValidationFailedError


class FakeEventRepository:
    def __init__(self) -> None:
        self._ids = count(1)
        self.events: dict[str, Event] = {}
        self.lineups: dict[str, set[str]] = {}

    def create(self, event: Event) -> Event:
        event_id = f'event-{next(self._ids)}'
        stored = self._with(event, id=event_id, created_at=datetime.now(timezone.utc))
        self.events[event_id] = stored
        self.lineups[event_id] = set()
        return stored

    def get(self, event_id: str) -> Event | None:
        event = self.events.get(event_id)
        if event is None:
            return None
        return self._with(event, comedian_ids=tuple(sorted(self.lineups[event_id])))

    def update_fields(self, event_id: str, fields: dict) -> None:
        self.events[event_id] = self._with(self.events[event_id], **fields)

    def set_status(self, event_id: str, status: EventStatus) -> None:
        self.events[event_id] = self._with(self.events[event_id], status=status)

    def add_comedian(self, event_id: str, comedian_id: str) -> bool:
        added = comedian_id not in self.lineups[event_id]
        self.lineups[event_id].add(comedian_id)
        return added

    def remove_comedian(self, event_id: str, comedian_id: str) -> bool:
        try:
            self.lineups[event_id].remove(comedian_id)
            return True
        except KeyError:
            return False

    def list_by_venue(self, venue_id: str, *, limit: int, from_time) -> list[Event]:  # noqa: ANN001
        events = [
            e for e in self.events.values()
            if e.venue_id == venue_id and (from_time is None or e.start_time >= from_time)
        ]
        return sorted(events, key=lambda e: e.start_time)[:limit]

    def list_nearby(
        self, lat: float, lng: float, *, radius_meters: int, from_time, limit: int  # noqa: ANN001
    ) -> list[Event]:
        def distance_m(e: Event) -> float:
            if e.latitude is None or e.longitude is None:
                return math.inf
            return math.hypot(e.latitude - lat, e.longitude - lng) * 111_000

        events = [
            e for e in self.events.values()
            if e.status is EventStatus.SCHEDULED
            and e.start_time >= from_time
            and distance_m(e) <= radius_meters
        ]
        return sorted(events, key=lambda e: e.start_time)[:limit]

    @staticmethod
    def _with(event: Event, **overrides: Any) -> Event:
        values = {
            'id': event.id,
            'venue_id': event.venue_id,
            'title': event.title,
            'start_time': event.start_time,
            'status': event.status,
            'description': event.description,
            'end_time': event.end_time,
            'place_id': event.place_id,
            'latitude': event.latitude,
            'longitude': event.longitude,
            'h3_index': event.h3_index,
            'ticket_url': event.ticket_url,
            'comedian_ids': event.comedian_ids,
            'created_at': event.created_at,
        }
        values.update(overrides)
        if isinstance(values['status'], str):
            values['status'] = EventStatus(values['status'])
        return Event(**values)


class FakeComedianLookup:
    def __init__(self, existing: set[str]) -> None:
        self.existing = existing

    def comedian_exists(self, comedian_id: str) -> bool:
        return comedian_id in self.existing


class FakePlaceResolver:
    def __init__(self, place: Any | None = None) -> None:
        self.place = place

    def resolve_city(self, lat: float, lng: float) -> Any | None:
        return self.place


def _venue(user_id: str = 'venue-1') -> AuthenticatedUser:
    return AuthenticatedUser(user_id=user_id, email=None, role='venue')


def _soon(hours: int = 24) -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=hours)


@pytest.fixture()
def repo() -> FakeEventRepository:
    return FakeEventRepository()


@pytest.fixture()
def service(repo: FakeEventRepository) -> EventService:
    return EventService(
        repository=repo,
        comedians=FakeComedianLookup({'comedian-1'}),
        place_resolver=FakePlaceResolver(),
        h3_resolution=9,
    )


def test_create_event(service: EventService) -> None:
    event = service.create(
        _venue(), title='Friday Comedy', start_time=_soon(), latitude=51.5, longitude=-0.1
    )
    assert event.venue_id == 'venue-1'
    assert event.h3_index is not None
    assert event.status is EventStatus.SCHEDULED


def test_create_rejects_bad_time_order(service: EventService) -> None:
    with pytest.raises(ValidationFailedError):
        service.create(
            _venue(), title='x', start_time=_soon(24), end_time=_soon(23)
        )


def test_create_rejects_http_ticket_url(service: EventService) -> None:
    with pytest.raises(ValidationFailedError):
        service.create(
            _venue(), title='x', start_time=_soon(), ticket_url='http://tickets.com'
        )


def test_update_owner_only(service: EventService) -> None:
    event = service.create(_venue(), title='x', start_time=_soon())
    with pytest.raises(PermissionDeniedError):
        service.update(event.id, _venue('other-venue'), {'title': 'hijacked'})
    updated = service.update(event.id, _venue(), {'title': 'renamed'})
    assert updated.title == 'renamed'


def test_cancel(service: EventService, repo: FakeEventRepository) -> None:
    event = service.create(_venue(), title='x', start_time=_soon())
    service.cancel(event.id, _venue())
    assert repo.events[event.id].status is EventStatus.CANCELLED


def test_add_comedian_validates_existence(service: EventService) -> None:
    event = service.create(_venue(), title='x', start_time=_soon())
    service.add_comedian(event.id, 'comedian-1', _venue())
    with pytest.raises(NotFoundError):
        service.add_comedian(event.id, 'ghost', _venue())
    assert service.get(event.id).comedian_ids == ('comedian-1',)


def test_remove_comedian(service: EventService) -> None:
    event = service.create(_venue(), title='x', start_time=_soon())
    service.add_comedian(event.id, 'comedian-1', _venue())
    service.remove_comedian(event.id, 'comedian-1', _venue())
    assert service.get(event.id).comedian_ids == ()


def test_nearby_excludes_cancelled_and_far(service: EventService) -> None:
    near = service.create(
        _venue(), title='near', start_time=_soon(), latitude=51.5, longitude=-0.1
    )
    service.create(
        _venue(), title='far', start_time=_soon(), latitude=48.8, longitude=2.35
    )
    cancelled = service.create(
        _venue(), title='cancelled', start_time=_soon(), latitude=51.5, longitude=-0.1
    )
    service.cancel(cancelled.id, _venue())
    results = service.list_nearby(51.5, -0.1, radius_meters=25_000)
    assert [e.title for e in results] == ['near']
    assert results[0].id == near.id


def test_list_by_venue_upcoming_only(service: EventService, repo: FakeEventRepository) -> None:
    past = service.create(_venue(), title='past', start_time=_soon())
    repo.events[past.id] = repo._with(
        repo.events[past.id], start_time=datetime.now(timezone.utc) - timedelta(days=1)
    )
    service.create(_venue(), title='future', start_time=_soon())
    upcoming = service.list_by_venue('venue-1')
    everything = service.list_by_venue('venue-1', upcoming_only=False)
    assert [e.title for e in upcoming] == ['future']
    assert len(everything) == 2
