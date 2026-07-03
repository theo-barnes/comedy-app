from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status

from shared.auth import AuthenticatedUser, get_current_user, require_role

from .factory import get_service
from .models.domain import ContentType, ContentVisibility
from .schemas import (
    ContentListResponse,
    ContentSchema,
    CreateContentRequest,
    CreateContentResponse,
)
from .service import ContentService

router = APIRouter(tags=['content'])
webhook_router = APIRouter(tags=['webhooks'])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
CreatorUser = Annotated[AuthenticatedUser, Depends(require_role('comedian', 'venue'))]
Service = Annotated[ContentService, Depends(get_service)]


@router.post('/content', response_model=CreateContentResponse,
             status_code=status.HTTP_201_CREATED)
def create_content(
    body: CreateContentRequest, user: CreatorUser, service: Service
) -> CreateContentResponse:
    content, upload_url = service.create(
        user,
        type=ContentType(body.type),
        title=body.title,
        description=body.description,
        visibility=ContentVisibility(body.visibility),
        latitude=body.latitude,
        longitude=body.longitude,
        event_id=body.eventId,
        image_url=body.imageUrl,
    )
    return CreateContentResponse(
        content=ContentSchema.from_domain(content), uploadUrl=upload_url
    )


@router.get('/content/{content_id}', response_model=ContentSchema)
def get_content(content_id: str, user: CurrentUser, service: Service) -> ContentSchema:
    return ContentSchema.from_domain(service.get(content_id, user))


@router.delete('/content/{content_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_content(content_id: str, user: CurrentUser, service: Service) -> None:
    service.delete(content_id, user)


@router.get('/creators/{creator_id}/content', response_model=ContentListResponse)
def list_creator_content(
    creator_id: str,
    user: CurrentUser,
    service: Service,
    limit: int = Query(20, ge=1, le=50),
    before: datetime | None = Query(None),
) -> ContentListResponse:
    items = service.list_by_creator(creator_id, user, limit=limit, before=before)
    return ContentListResponse(items=[ContentSchema.from_domain(c) for c in items])


@webhook_router.post('/webhooks/cloudflare-stream', status_code=status.HTTP_204_NO_CONTENT)
async def cloudflare_stream_webhook(request: Request, service: Service) -> None:
    body = await request.body()
    payload = await request.json()
    service.handle_webhook(body, request.headers.get('webhook-signature'), payload)
