"""Business logic for creating, updating, and querying events."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import isfinite
from typing import Any, Protocol
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import h3

from shared.auth.models import AuthenticatedUser
from shared.errors import NotFoundError, PermissionDeniedError, ValidationFailedError
from shared.ports import PlaceLookup

from .models.domain import Event, EventStatus
from .repository import EventRepository
from .validation import parse_local_time, validate_ticket_url


class ComedianLookup(Protocol):
    """Narrow view of the creators module used to validate a comedian_id exists."""

    def comedian_exists(self, comedian_id: str) -> bool: ...


@dataclass(frozen=True, slots=True)
class NativeVenue:
    name: str
    address: str | None
    latitude: float | None
    longitude: float | None


class VenueLookup(Protocol):
    """The caller's stored venue details needed for native publishing."""

    def get_venue(self, user_id: str) -> NativeVenue | None: ...


class EventService:
    """Business logic for creating, updating, and querying events."""

    def __init__(
        self,
        repository: EventRepository,
        comedians: ComedianLookup,
        place_resolver: PlaceLookup,
        *,
        h3_resolution: int = 9,
        venues: VenueLookup | None = None,
    ) -> None:
        self._repository = repository
        self._comedians = comedians
        self._places = place_resolver
        self._h3_resolution = h3_resolution
        self._venues = venues

    def create_native(
        self,
        user: AuthenticatedUser,
        *,
        title: str,
        local_start_time: str,
        time_zone: str,
        local_end_time: str | None = None,
        description: str | None = None,
        ticket_url: str | None = None,
    ) -> Event:
        if user.role != 'venue':
            raise PermissionDeniedError('only venues can publish native events')
        title = title.strip()
        if not 1 <= len(title) <= 200:
            raise ValidationFailedError('title must contain 1 to 200 characters')
        if description is not None and len(description) > 2000:
            raise ValidationFailedError('description must contain at most 2000 characters')
        if ticket_url is not None:
            try:
                ticket_url = validate_ticket_url(ticket_url)
            except ValueError as exc:
                raise ValidationFailedError('ticketUrl must be a valid HTTPS URL with a host') from exc
        try:
            zone = ZoneInfo(time_zone)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValidationFailedError('timeZone must be a valid IANA timezone') from exc
        start = self._native_utc_time(local_start_time, zone, 'localStartTime')
        end = (
            self._native_utc_time(local_end_time, zone, 'localEndTime')
            if local_end_time is not None else None
        )
        if start <= datetime.now(timezone.utc):
            raise ValidationFailedError('localStartTime must be in the future')
        self._validate_times(start, end)
        if self._venues is None:
            raise RuntimeError('native event creation requires a venue lookup')
        venue = self._venues.get_venue(user.user_id)
        if venue is None or not venue.name.strip() or not venue.address or not venue.address.strip():
            raise ValidationFailedError('set up a venue name and address before publishing')
        if (
            venue.latitude is None or venue.longitude is None
            or not isfinite(venue.latitude) or not isfinite(venue.longitude)
            or not -90 <= venue.latitude <= 90 or not -180 <= venue.longitude <= 180
        ):
            raise ValidationFailedError('set up valid venue latitude and longitude before publishing')
        return self.create(
            user,
            title=title,
            description=description,
            start_time=start,
            end_time=end,
            latitude=venue.latitude,
            longitude=venue.longitude,
            ticket_url=ticket_url,
        )

    @staticmethod
    def _native_utc_time(value: str, zone: ZoneInfo, field: str) -> datetime:
        try:
            local = parse_local_time(value)
        except ValueError as exc:
            raise ValidationFailedError(f'{field}: {exc}') from exc
        # Round-trip both folds: a gap has none, an overlap has two distinct UTC instants.
        candidates: set[datetime] = set()
        try:
            for fold in (0, 1):
                utc = local.replace(tzinfo=zone, fold=fold).astimezone(timezone.utc)
                if utc.astimezone(zone).replace(tzinfo=None) == local:
                    candidates.add(utc)
        except (OverflowError, ValueError) as exc:
            raise ValidationFailedError(f'{field} is outside the supported datetime range') from exc
        if not candidates:
            raise ValidationFailedError(f'{field} is a nonexistent local time in {zone.key}')
        if len(candidates) > 1:
            raise ValidationFailedError(f'{field} is an ambiguous local time in {zone.key}')
        return candidates.pop()

    def create(
        self,
        user: AuthenticatedUser,
        *,
        title: str,
        start_time: datetime,
        end_time: datetime | None = None,
        description: str | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
        ticket_url: str | None = None,
    ) -> Event:
        self._validate_times(start_time, end_time)
        if (latitude is None) != (longitude is None):
            raise ValidationFailedError('latitude and longitude must be provided together')
        if ticket_url is not None and not ticket_url.startswith('https://'):
            raise ValidationFailedError('ticketUrl must be https')

        place_id: str | None = None
        h3_index: str | None = None
        if latitude is not None and longitude is not None:
            h3_index = h3.latlng_to_cell(latitude, longitude, self._h3_resolution)
            place = self._places.resolve_city(latitude, longitude)
            if place is not None:
                place_id = place.id

        return self._repository.create(
            Event(
                id='',  # assigned by the database
                venue_id=user.user_id,
                title=title,
                start_time=start_time,
                end_time=end_time,
                description=description,
                place_id=place_id,
                latitude=latitude,
                longitude=longitude,
                h3_index=h3_index,
                ticket_url=ticket_url,
            )
        )

    def update(
        self,
        event_id: str,
        user: AuthenticatedUser,
        fields: dict[str, Any],
    ) -> Event:
        """Apply a partial update; re-derives h3_index/place_id when coordinates change."""

        event = self._owned_event(event_id, user)
        start = fields.get('start_time', event.start_time)
        end = fields.get('end_time', event.end_time)
        self._validate_times(start, end)
        ticket_url = fields.get('ticket_url')
        if ticket_url is not None and not ticket_url.startswith('https://'):
            raise ValidationFailedError('ticketUrl must be https')
        if ('latitude' in fields) != ('longitude' in fields):
            raise ValidationFailedError('latitude and longitude must be updated together')
        if 'latitude' in fields and fields['latitude'] is not None:
            fields['h3_index'] = h3.latlng_to_cell(
                fields['latitude'], fields['longitude'], self._h3_resolution
            )
            place = self._places.resolve_city(fields['latitude'], fields['longitude'])
            fields['place_id'] = place.id if place is not None else None
        self._repository.update_fields(event_id, fields)
        updated = self._repository.get(event_id)
        assert updated is not None
        return updated

    def cancel(self, event_id: str, user: AuthenticatedUser) -> None:
        self._owned_event(event_id, user)
        self._repository.set_status(event_id, EventStatus.CANCELLED)

    def add_comedian(self, event_id: str, comedian_id: str, user: AuthenticatedUser) -> None:
        self._owned_event(event_id, user)
        if not self._comedians.comedian_exists(comedian_id):
            raise NotFoundError('comedian not found')
        self._repository.add_comedian(event_id, comedian_id)

    def remove_comedian(self, event_id: str, comedian_id: str, user: AuthenticatedUser) -> None:
        self._owned_event(event_id, user)
        self._repository.remove_comedian(event_id, comedian_id)

    def get(self, event_id: str) -> Event:
        event = self._repository.get(event_id)
        if event is None:
            raise NotFoundError('event not found')
        return event

    def list_nearby(
        self, lat: float, lng: float, *, radius_meters: int = 25_000, limit: int = 50
    ) -> list[Event]:
        return self._repository.list_nearby(
            lat,
            lng,
            radius_meters=radius_meters,
            from_time=datetime.now(timezone.utc),
            limit=limit,
        )

    def list_by_venue(self, venue_id: str, *, limit: int = 50, upcoming_only: bool = True) -> list[Event]:
        from_time = datetime.now(timezone.utc) if upcoming_only else None
        return self._repository.list_by_venue(venue_id, limit=limit, from_time=from_time)

    def _owned_event(self, event_id: str, user: AuthenticatedUser) -> Event:
        event = self._repository.get(event_id)
        if event is None:
            raise NotFoundError('event not found')
        if event.venue_id != user.user_id:
            raise PermissionDeniedError('only the venue can modify this event')
        return event

    @staticmethod
    def _validate_times(start_time: datetime, end_time: datetime | None) -> None:
        if end_time is not None and end_time <= start_time:
            raise ValidationFailedError('endTime must be after startTime')
