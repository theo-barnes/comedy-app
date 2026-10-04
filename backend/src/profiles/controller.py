"""HTTP adapter for viewing another account's public identity."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends

from shared.auth import AuthenticatedUser, get_current_user

from .factory import get_service
from .schemas import PublicProfileSchema
from .service import PublicProfileService

router = APIRouter(tags=['profiles'])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
Service = Annotated[PublicProfileService, Depends(get_service)]


@router.get('/profiles/{user_id}', response_model=PublicProfileSchema)
def get_public_profile(
    user_id: UUID,
    _user: CurrentUser,
    service: Service,
) -> PublicProfileSchema:
    return PublicProfileSchema.from_domain(service.get_public_profile(str(user_id)))