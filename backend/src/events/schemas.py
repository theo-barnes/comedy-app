"""API request/response schemas for the events endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_validator

from .models.domain import Event
from .validation import parse_local_time, validate_ticket_url


class CreateEventRequest(BaseModel):
    """Body for POST /events."""

    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    startTime: datetime
    endTime: datetime | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    ticketUrl: str | None = Field(None, max_length=1000)


class CreateNativeEventRequest(BaseModel):
    """Venue-owned publishing, with explicit local wall times and no client location."""

    model_config = ConfigDict(extra='forbid')

    title: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
    description: str | None = Field(None, max_length=2000)
    localStartTime: str
    localEndTime: str | None = None
    timeZone: str = Field(..., min_length=1)
    ticketUrl: str | None = Field(None, max_length=1000)

    @field_validator('localStartTime', 'localEndTime')
    @classmethod
    def validate_local_time(cls, value: str | None) -> str | None:
        if value is not None:
            parse_local_time(value)
        return value

    @field_validator('ticketUrl')
    @classmethod
    def validate_ticket(cls, value: str | None) -> str | None:
        return validate_ticket_url(value) if value is not None else None


class UpdateEventRequest(BaseModel):
    """Body for PATCH /events/{event_id}; all fields optional (partial update)."""

    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    startTime: datetime | None = None
    endTime: datetime | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    ticketUrl: str | None = Field(None, max_length=1000)

    def to_fields(self) -> dict:
        """Convert to the {field: value} shape EventService.update expects, dropping unset fields."""

        mapping = {
            'title': self.title,
            'description': self.description,
            'start_time': self.startTime,
            'end_time': self.endTime,
            'ticket_url': self.ticketUrl,
        }
        fields = {k: v for k, v in mapping.items() if v is not None}
        # The service validates that coordinates arrive as a pair.
        if self.latitude is not None:
            fields['latitude'] = self.latitude
        if self.longitude is not None:
            fields['longitude'] = self.longitude
        return fields


class EventSchema(BaseModel):
    """Wire schema for an event."""

    id: str
    venueId: str
    title: str
    description: str | None = None
    startTime: datetime
    endTime: datetime | None = None
    placeId: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    ticketUrl: str | None = None
    status: str
    comedianIds: list[str] = Field(default_factory=list)
    posterUrl: str | None = None
    posterRevision: int = 0
    posterWidth: int | None = None
    posterHeight: int | None = None

    @staticmethod
    def from_domain(event: Event) -> 'EventSchema':
        return EventSchema(
            id=event.id,
            venueId=event.venue_id,
            title=event.title,
            description=event.description,
            startTime=event.start_time,
            endTime=event.end_time,
            placeId=event.place_id,
            latitude=event.latitude,
            longitude=event.longitude,
            ticketUrl=event.ticket_url,
            status=event.status.value,
            comedianIds=list(event.comedian_ids),
            posterUrl=event.poster_url,
            posterRevision=event.poster_revision,
            posterWidth=event.poster_width,
            posterHeight=event.poster_height,
        )


class EventListResponse(BaseModel):
    """Wire schema for endpoints that return a list of events."""

    items: list[EventSchema]
