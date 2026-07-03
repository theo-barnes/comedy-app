from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Protocol

import h3

from shared.auth.models import AuthenticatedUser
from shared.errors import NotFoundError, PermissionDeniedError, ValidationFailedError

from .models.domain import Event, EventStatus
from .repository import EventRepository


class ComedianLookup(Protocol):
    def comedian_exists(self, comedian_id: str) -> bool: ...


class PlaceResolver(Protocol):
    def resolve_city(self, lat: float, lng: float) -> Any | None: ...


class EventService:
    def __init__(
        self,
        repository: EventRepository,
        comedians: ComedianLookup,
        place_resolver: PlaceResolver,
        *,
        h3_resolution: int = 9,
    ) -> None:
        self._repository = repository
        self._comedians = comedians
        self._places = place_resolver
        self._h3_resolution = h3_resolution

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
