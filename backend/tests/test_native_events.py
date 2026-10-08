from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta, timezone
from typing import get_args, get_type_hints
from unittest.mock import Mock

import h3
import pytest
from pydantic import ValidationError

from creators.models.domain import VenueProfile
from events.controller import (
    EventWriteRateLimit, VenueUser, create_event, create_native_event, router,
)
from events.factory import RepositoryVenueLookup
from events.models.domain import EventStatus
from events.schemas import CreateEventRequest, CreateNativeEventRequest, EventSchema
from events.service import EventService, NativeVenue
from shared.auth.models import AuthenticatedUser
from shared.errors import PermissionDeniedError, ValidationFailedError
from tests.test_events import FakeComedianLookup, FakeEventRepository, FakePlaceLookup


class FakeVenueLookup:
    def __init__(self, venue: NativeVenue | None) -> None:
        self.venue = venue
        self.requested_ids: list[str] = []

    def get_venue(self, user_id: str) -> NativeVenue | None:
        self.requested_ids.append(user_id)
        return self.venue


VENUE = NativeVenue('The Cellar', '1 Comedy St', 51.5, -0.1)
USER = AuthenticatedUser(user_id='venue-1', email=None, role='venue')


def _payload(**overrides) -> dict:
    payload = {
        'title': '  Friday Comedy  ',
        'description': 'Stand-up night',
        'localStartTime': (datetime.now(timezone.utc) + timedelta(days=30)).strftime('%Y-%m-%dT20:00'),
        'timeZone': 'Europe/London',
        'ticketUrl': 'https://tickets.example/show',
    }
    return payload | overrides


def _service(venue: NativeVenue | None = VENUE) -> tuple[EventService, FakeVenueLookup]:
    lookup = FakeVenueLookup(venue)
    return EventService(
        FakeEventRepository(),
        FakeComedianLookup(set()),
        FakePlaceLookup(Mock(id='london')),
        venues=lookup,
    ), lookup


def _publish(service: EventService, user: AuthenticatedUser = USER, **overrides):
    body = _payload(**overrides)
    return service.create_native(
        user,
        title=body['title'],
        description=body.get('description'),
        local_start_time=body['localStartTime'],
        local_end_time=body.get('localEndTime'),
        time_zone=body['timeZone'],
        ticket_url=body.get('ticketUrl'),
    )


def test_native_creation_uses_stored_venue_and_existing_place_h3() -> None:
    service, lookup = _service()
    event = _publish(service)
    assert lookup.requested_ids == [USER.user_id]
    assert event.venue_id == USER.user_id
    assert (event.latitude, event.longitude) == (VENUE.latitude, VENUE.longitude)
    assert event.place_id == 'london'
    assert event.h3_index == h3.latlng_to_cell(51.5, -0.1, 9)
    assert event.title == 'Friday Comedy'
    assert event.description == 'Stand-up night'
    assert event.ticket_url == 'https://tickets.example/show'
    assert event.status is EventStatus.SCHEDULED
    assert event.start_time.tzinfo is timezone.utc


def test_native_overnight_end_and_bst_conversion() -> None:
    service, _ = _service()
    # Far-future summer dates keep this contract independent of the test run date.
    event = _publish(
        service, localStartTime='2099-07-10T23:30', localEndTime='2099-07-11T01:00',
    )
    assert event.start_time == datetime(2099, 7, 10, 22, 30, tzinfo=timezone.utc)
    assert event.end_time == datetime(2099, 7, 11, 0, 0, tzinfo=timezone.utc)


def test_native_optional_fields() -> None:
    service, _ = _service()
    event = _publish(service, description=None, ticketUrl=None)
    assert event.description is None
    assert event.ticket_url is None
    assert event.end_time is None


def test_native_rejects_past_start() -> None:
    service, _ = _service()
    past = (datetime.now(timezone.utc) - timedelta(days=1)).strftime('%Y-%m-%dT%H:%M')
    with pytest.raises(ValidationFailedError, match='future'):
        _publish(service, localStartTime=past, timeZone='UTC')


@pytest.mark.parametrize('end', ['2099-07-10T23:30', '2099-07-10T01:00'])
def test_native_rejects_end_not_after_start(end: str) -> None:
    service, _ = _service()
    with pytest.raises(ValidationFailedError, match='after'):
        _publish(service, localStartTime='2099-07-10T23:30', localEndTime=end)


@pytest.mark.parametrize('zone', ['', 'Not/AZone', '/Europe/London', '../Europe/London'])
def test_native_rejects_invalid_timezone(zone: str) -> None:
    service, _ = _service()
    with pytest.raises(ValidationFailedError, match='IANA'):
        _publish(service, timeZone=zone)


@pytest.mark.parametrize(
    ('local', 'message'),
    [('2099-03-29T01:30', 'nonexistent'), ('2099-10-25T01:30', 'ambiguous')],
)
@pytest.mark.parametrize('field', ['localStartTime', 'localEndTime'])
def test_native_rejects_dst_gap_and_overlap(local: str, message: str, field: str) -> None:
    service, _ = _service()
    with pytest.raises(ValidationFailedError, match=f'{field}.*{message}'):
        _publish(service, **{field: local})


@pytest.mark.parametrize(
    'venue',
    [
        None, replace(VENUE, name=' '), replace(VENUE, address=None),
        replace(VENUE, address='  '), replace(VENUE, latitude=None),
        replace(VENUE, longitude=None), replace(VENUE, latitude=91),
        replace(VENUE, longitude=-181), replace(VENUE, latitude=float('nan')),
        replace(VENUE, longitude=float('inf')),
    ],
)
def test_native_requires_usable_stored_venue(venue: NativeVenue | None) -> None:
    service, _ = _service(venue)
    with pytest.raises(ValidationFailedError, match='set up'):
        _publish(service)


def test_native_accepts_zero_coordinates() -> None:
    service, _ = _service(replace(VENUE, latitude=0, longitude=0))
    event = _publish(service)
    assert (event.latitude, event.longitude) == (0, 0)


def test_native_missing_lookup_explicitly_unavailable() -> None:
    service = EventService(FakeEventRepository(), FakeComedianLookup(set()), FakePlaceLookup())
    with pytest.raises(RuntimeError, match='requires a venue lookup'):
        _publish(service)


@pytest.mark.parametrize('role', ['fan', 'comedian', None])
def test_native_rejects_other_roles_in_service_and_route_dependency(role: str | None) -> None:
    user = AuthenticatedUser(user_id='not-venue', email=None, role=role)
    service, lookup = _service()
    with pytest.raises(PermissionDeniedError):
        _publish(service, user)
    assert lookup.requested_ids == []
    role_dependency = get_args(VenueUser)[1].dependency
    with pytest.raises(PermissionDeniedError):
        role_dependency(user)


@pytest.mark.parametrize('title', [' ', '', 'x' * 201])
def test_native_title_rejected_by_schema_and_service(title: str) -> None:
    with pytest.raises(ValidationError):
        CreateNativeEventRequest(**_payload(title=title))
    service, _ = _service()
    with pytest.raises(ValidationFailedError, match='title'):
        _publish(service, title=title)


@pytest.mark.parametrize(
    'url',
    ['http://tickets.example', 'https://', 'https:///tickets', 'not-a-url', 'https://?a=b',
     'https://tickets.example/\nshow', 'https://\\tickets.example'],
)
def test_native_ticket_requires_valid_https_host(url: str) -> None:
    with pytest.raises(ValidationError):
        CreateNativeEventRequest(**_payload(ticketUrl=url))
    service, _ = _service()
    with pytest.raises(ValidationFailedError, match='HTTPS'):
        _publish(service, ticketUrl=url)


def test_native_normalizes_valid_https_url() -> None:
    service, _ = _service()
    assert _publish(service, ticketUrl='HTTPS://Tickets.Example').ticket_url == 'https://tickets.example/'


@pytest.mark.parametrize(
    'local',
    ['2099-02-30T20:00', '2099-01-01', '2099-01-01T20:00Z',
     '2099-01-01T20:00:00', '2099-01-01T20:00+01:00'],
)
def test_native_requires_exact_naive_local_datetime(local: str) -> None:
    with pytest.raises(ValidationError):
        CreateNativeEventRequest(**_payload(localStartTime=local))
    service, _ = _service()
    with pytest.raises(ValidationFailedError, match='localStartTime'):
        _publish(service, localStartTime=local)


def test_native_request_contract_and_extra_fields() -> None:
    assert set(CreateNativeEventRequest.model_fields) == {
        'title', 'description', 'localStartTime', 'localEndTime', 'timeZone', 'ticketUrl',
    }
    for extra in ('venueId', 'latitude', 'longitude'):
        with pytest.raises(ValidationError):
            CreateNativeEventRequest(**_payload(**{extra: 'spoofed'}))
    with pytest.raises(ValidationError):
        CreateNativeEventRequest(**_payload(description='x' * 2001))
    with pytest.raises(ValidationError):
        CreateNativeEventRequest(title='Title', localStartTime='2099-01-01T20:00')
    assert CreateNativeEventRequest(**_payload()).title == 'Friday Comedy'


def test_native_unrepresentable_utc_time_is_validation_error() -> None:
    service, _ = _service()
    with pytest.raises(ValidationFailedError, match='supported datetime range'):
        _publish(service, localStartTime='0001-01-01T00:00', timeZone='Asia/Tokyo')


def test_native_controller_preserves_response_contract_auth_limiter_and_route_order() -> None:
    hints = get_type_hints(create_native_event, include_extras=True)
    assert hints['user'] == VenueUser
    assert create_native_event.__defaults__[-1] is EventWriteRateLimit
    assert create_event.__defaults__[-1] is EventWriteRateLimit
    paths = [route.path for route in router.routes]
    assert paths.index('/events/native') < paths.index('/events/{event_id}')
    route = next(route for route in router.routes if route.path == '/events/native')
    assert route.methods == {'POST'}
    assert route.status_code == 201
    assert route.response_model is EventSchema
    service, _ = _service()
    response = create_native_event(CreateNativeEventRequest(**_payload()), USER, service)
    assert response.venueId == USER.user_id
    assert response.latitude == VENUE.latitude
    assert response.status == 'scheduled'
    assert response.startTime.tzinfo is timezone.utc


def test_native_lookup_adapter_queries_only_callers_venue() -> None:
    repository = Mock()
    repository.get_venue.return_value = VenueProfile(
        user_id=USER.user_id, venue_name=VENUE.name, address=VENUE.address,
        latitude=VENUE.latitude, longitude=VENUE.longitude,
    )
    assert RepositoryVenueLookup(repository).get_venue(USER.user_id) == VENUE
    repository.get_venue.assert_called_once_with(USER.user_id)
    repository.get_venue.return_value = None
    assert RepositoryVenueLookup(repository).get_venue('missing') is None


def test_native_factory_wires_stored_venue_lookup(monkeypatch: pytest.MonkeyPatch) -> None:
    from creators import factory as creators_factory
    from events import factory as events_factory
    from location import factory as location_factory

    creators = Mock()
    creators.get_venue.return_value = VenueProfile(
        user_id=USER.user_id, venue_name=VENUE.name, address=VENUE.address,
        latitude=VENUE.latitude, longitude=VENUE.longitude,
    )
    monkeypatch.setattr(creators_factory, 'build_repository', lambda: creators)
    monkeypatch.setattr(events_factory, 'build_repository', FakeEventRepository)
    monkeypatch.setattr(location_factory, 'build_repository', FakePlaceLookup)
    event = _publish(events_factory.get_service.__wrapped__())
    assert event.venue_id == USER.user_id
    assert (event.latitude, event.longitude) == (VENUE.latitude, VENUE.longitude)
    creators.get_venue.assert_called_once_with(USER.user_id)


def test_legacy_creation_contract_remains_unchanged() -> None:
    service, _ = _service(None)
    body = CreateEventRequest(title=' ', startTime='2000-01-01T00:00:00Z', latitude=10, longitude=20)
    event = create_event(body, USER, service)
    assert event.title == ' '
    assert event.startTime.year == 2000
    assert (event.latitude, event.longitude) == (10, 20)
