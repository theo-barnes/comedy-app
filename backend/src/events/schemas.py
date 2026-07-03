from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from .models.domain import Event


class CreateEventRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    startTime: datetime
    endTime: datetime | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    ticketUrl: str | None = Field(None, max_length=1000)


class UpdateEventRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=2000)
    startTime: datetime | None = None
    endTime: datetime | None = None
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)
    ticketUrl: str | None = Field(None, max_length=1000)

    def to_fields(self) -> dict:
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
        )


class EventListResponse(BaseModel):
    items: list[EventSchema]
