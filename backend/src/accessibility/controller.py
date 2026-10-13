"""HTTP adapter for optional accessibility narration."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from fastapi.responses import Response

from shared.auth import AuthenticatedUser, get_current_user
from shared.config import settings
from shared.ratelimit import rate_limited

from .factory import get_service
from .models.domain import NarrationResourceType
from .service import NarrationService

router = APIRouter(tags=['accessibility'])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Service = Annotated[NarrationService, Depends(get_service)]


NarrationRateLimit = Depends(
    rate_limited(
        'accessibility-narration',
        limit=settings.elevenlabs_narration_requests_per_hour,
        window_seconds=3600,
    )
)


@router.get('/accessibility/narration/{resource_type}/{resource_id}', response_class=Response)
def narrate(
    resource_type: NarrationResourceType,
    resource_id: str,
    user: CurrentUser,
    service: Service,
    _rl: None = NarrationRateLimit,
) -> Response:
    del user
    narration = service.narrate(resource_type, resource_id)
    return Response(
        content=narration.audio,
        media_type=narration.content_type,
        headers={
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
        },
    )
