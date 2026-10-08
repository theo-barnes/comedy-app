"""HTTP layer for the events domain."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Query, status

from shared.auth import AuthenticatedUser, get_current_user, require_role
from shared.ratelimit import rate_limited
from images.factory import get_service as get_poster_service
from images.schemas import (
    PosterAttachRequest, PosterCompleteSchema, PosterConfigSchema, PosterRemoveRequest,
    PosterUploadRequest, PosterUploadSchema,
)
from images.service import PosterService

from .factory import get_service
from .schemas import (
    CreateEventRequest, CreateNativeEventRequest, EventListResponse, EventSchema, UpdateEventRequest,
)
from .service import EventService

router = APIRouter(tags=['events'])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
VenueUser = Annotated[AuthenticatedUser, Depends(require_role('venue'))]
Service = Annotated[EventService, Depends(get_service)]

EventWriteRateLimit = Depends(rate_limited('event-write', limit=20, window_seconds=3600))
PosterServiceDependency = Annotated[PosterService, Depends(get_poster_service)]
PosterWriteRateLimit = Depends(rate_limited('event-poster', limit=30, window_seconds=3600))


@router.get('/events/poster-config', response_model=PosterConfigSchema)
def poster_config(user: CurrentUser, posters: PosterServiceDependency) -> PosterConfigSchema:
    return PosterConfigSchema(enabled=posters.enabled)


@router.post('/events/{event_id}/poster/uploads', response_model=PosterUploadSchema)
def create_poster_upload(
    event_id: str, body: PosterUploadRequest, user: VenueUser, posters: PosterServiceDependency,
    _rl: None = PosterWriteRateLimit,
) -> PosterUploadSchema:
    intent = posters.initiate(event_id, user, body.contentType, body.fileSize)
    return PosterUploadSchema(
        assetId=intent.asset_id, uploadUrl=intent.upload_url, uploadToken=intent.upload_token,
        bucketName=intent.bucket_name, objectName=intent.object_name,
    )


@router.post(
    '/events/{event_id}/poster/uploads/{asset_id}/complete', response_model=PosterCompleteSchema,
)
def complete_poster_upload(
    event_id: str, asset_id: UUID, user: VenueUser, posters: PosterServiceDependency,
    _rl: None = PosterWriteRateLimit,
) -> PosterCompleteSchema:
    width, height = posters.complete(event_id, str(asset_id), user)
    return PosterCompleteSchema(assetId=str(asset_id), width=width, height=height)


@router.put('/events/{event_id}/poster', response_model=EventSchema)
def attach_poster(
    event_id: str, body: PosterAttachRequest, user: VenueUser,
    posters: PosterServiceDependency, service: Service, _rl: None = PosterWriteRateLimit,
) -> EventSchema:
    posters.attach(event_id, body.assetId, body.expectedRevision, user)
    return EventSchema.from_domain(service.get(event_id))


@router.delete('/events/{event_id}/poster', response_model=EventSchema)
def remove_poster(
    event_id: str, body: PosterRemoveRequest, user: VenueUser,
    posters: PosterServiceDependency, service: Service, _rl: None = PosterWriteRateLimit,
) -> EventSchema:
    posters.remove(event_id, body.expectedRevision, user)
    return EventSchema.from_domain(service.get(event_id))


@router.post('/events', response_model=EventSchema, status_code=status.HTTP_201_CREATED)
def create_event(
    body: CreateEventRequest, user: VenueUser, service: Service, _rl: None = EventWriteRateLimit
) -> EventSchema:
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


@router.post('/events/native', response_model=EventSchema, status_code=status.HTTP_201_CREATED)
def create_native_event(
    body: CreateNativeEventRequest, user: VenueUser, service: Service,
    idempotency_key: Annotated[str | None, Header(alias='Idempotency-Key')] = None,
    _rl: None = EventWriteRateLimit,
) -> EventSchema:
    return EventSchema.from_domain(service.create_native(
        user,
        title=body.title,
        description=body.description,
        local_start_time=body.localStartTime,
        local_end_time=body.localEndTime,
        time_zone=body.timeZone,
        ticket_url=body.ticketUrl,
        idempotency_key=idempotency_key,
    ))


@router.patch('/events/{event_id}', response_model=EventSchema)
def update_event(
    event_id: str,
    body: UpdateEventRequest,
    user: VenueUser,
    service: Service,
    _rl: None = EventWriteRateLimit,
) -> EventSchema:
    return EventSchema.from_domain(service.update(event_id, user, body.to_fields()))


@router.delete('/events/{event_id}', status_code=status.HTTP_204_NO_CONTENT)
def cancel_event(event_id: str, user: VenueUser, service: Service, _rl: None = EventWriteRateLimit) -> None:
    service.cancel(event_id, user)


@router.post(
    '/events/{event_id}/comedians/{comedian_id}', status_code=status.HTTP_204_NO_CONTENT
)
def add_event_comedian(
    event_id: str, comedian_id: str, user: VenueUser, service: Service, _rl: None = EventWriteRateLimit
) -> None:
    service.add_comedian(event_id, comedian_id, user)


@router.delete(
    '/events/{event_id}/comedians/{comedian_id}', status_code=status.HTTP_204_NO_CONTENT
)
def remove_event_comedian(
    event_id: str, comedian_id: str, user: VenueUser, service: Service, _rl: None = EventWriteRateLimit
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
