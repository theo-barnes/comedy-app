from __future__ import annotations

from datetime import datetime
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status

from shared.auth import AuthenticatedUser, get_current_user, require_role
from shared.cache import create_cache
from shared.config import settings
from shared.ratelimit import RateLimiter

from .factory import get_service
from .models.domain import ContentType, ContentVisibility
from .schemas import (
    ContentListResponse,
    ContentSchema,
    CompleteUploadRequest,
    CreateContentRequest,
    CreateContentResponse,
    UploadDescriptorSchema,
)
from .service import ContentService

router = APIRouter(tags=['content'])
webhook_router = APIRouter(tags=['webhooks'])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
CreatorUser = Annotated[AuthenticatedUser, Depends(require_role('comedian', 'venue'))]
Service = Annotated[ContentService, Depends(get_service)]


@lru_cache(maxsize=1)
def _upload_limiter() -> RateLimiter:
    return RateLimiter(create_cache(settings.redis_url), limit=5, window_seconds=60)


@router.post('/content', response_model=CreateContentResponse,
             status_code=status.HTTP_201_CREATED)
def create_content(
    body: CreateContentRequest, user: CreatorUser, service: Service
) -> CreateContentResponse:
    if body.type == 'video_clip':
        _upload_limiter().check(f'video-upload:{user.user_id}')
    content, upload = service.create(
        user,
        type=ContentType(body.type),
        title=body.title,
        description=body.description,
        visibility=ContentVisibility(body.visibility),
        latitude=body.latitude,
        longitude=body.longitude,
        event_id=body.eventId,
        image_url=body.imageUrl,
        file_size_bytes=body.file.sizeBytes if body.file else None,
        file_mime_type=body.file.mimeType if body.file else None,
        original_filename=body.file.name if body.file else None,
    )
    return CreateContentResponse(
        content=ContentSchema.from_domain(content),
        uploadUrl=upload.upload_url if upload else None,
        upload=(
            UploadDescriptorSchema(
                mediaAssetId=upload.media_asset_id or '',
                protocol=upload.protocol,
                url=upload.upload_url,
                expiresAt=upload.expires_at,
                headers=upload.headers or {},
            )
            if upload
            else None
        ),
    )


@router.post(
    '/content/{content_id}/upload-complete',
    response_model=ContentSchema,
    status_code=status.HTTP_202_ACCEPTED,
)
def complete_upload(
    content_id: str,
    body: CompleteUploadRequest,
    user: CreatorUser,
    service: Service,
) -> ContentSchema:
    return ContentSchema.from_domain(service.confirm_upload(content_id, body.mediaAssetId, user))


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
