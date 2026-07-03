from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from shared.auth import AuthenticatedUser, get_current_user, require_role

from .factory import get_service
from .schemas import CreateEventRequest, EventListResponse, EventSchema, UpdateEventRequest
from .service import EventService

router = APIRouter(tags=['events'])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
VenueUser = Annotated[AuthenticatedUser, Depends(require_role('venue'))]
Service = Annotated[EventService, Depends(get_service)]


@router.post('/events', response_model=EventSchema, status_code=status.HTTP_201_CREATED)
def create_event(body: CreateEventRequest, user: VenueUser, service: Service) -> EventSchema:
    event = service.create(
        user,
        title=body.title,
        description=body.description,
        start_time=body.startTime,
        end_time=body.endTime,
        latitude=body.latitude,
        longitude=body.longitude,
        ticket_url=body.ticketUrl,
    )
    return EventSchema.from_domain(event)


@router.patch('/events/{event_id}', response_model=EventSchema)
def update_event(
    event_id: str, body: UpdateEventRequest, user: VenueUser, service: Service
) -> EventSchema:
    return EventSchema.from_domain(service.update(event_id, user, body.to_fields()))


@router.delete('/events/{event_id}', status_code=status.HTTP_204_NO_CONTENT)
def cancel_event(event_id: str, user: VenueUser, service: Service) -> None:
    service.cancel(event_id, user)


@router.post(
    '/events/{event_id}/comedians/{comedian_id}', status_code=status.HTTP_204_NO_CONTENT
)
def add_event_comedian(
    event_id: str, comedian_id: str, user: VenueUser, service: Service
) -> None:
    service.add_comedian(event_id, comedian_id, user)


@router.delete(
    '/events/{event_id}/comedians/{comedian_id}', status_code=status.HTTP_204_NO_CONTENT
)
def remove_event_comedian(
    event_id: str, comedian_id: str, user: VenueUser, service: Service
) -> None:
    service.remove_comedian(event_id, comedian_id, user)


@router.get('/events/nearby', response_model=EventListResponse)
def nearby_events(
    user: CurrentUser,
    service: Service,
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius: int = Query(25_000, ge=100, le=100_000, description='radius in meters'),
    limit: int = Query(50, ge=1, le=100),
) -> EventListResponse:
    events = service.list_nearby(lat, lng, radius_meters=radius, limit=limit)
    return EventListResponse(items=[EventSchema.from_domain(e) for e in events])


@router.get('/events/{event_id}', response_model=EventSchema)
def get_event(event_id: str, user: CurrentUser, service: Service) -> EventSchema:
    return EventSchema.from_domain(service.get(event_id))


@router.get('/venues/{venue_id}/events', response_model=EventListResponse)
def list_venue_events(
    venue_id: str,
    user: CurrentUser,
    service: Service,
    limit: int = Query(50, ge=1, le=100),
    upcomingOnly: bool = Query(True),
) -> EventListResponse:
    events = service.list_by_venue(venue_id, limit=limit, upcoming_only=upcomingOnly)
    return EventListResponse(items=[EventSchema.from_domain(e) for e in events])
