from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from shared.auth import AuthenticatedUser, get_current_user, require_role

from .factory import get_service
from .schemas import CreatorPublicSchema, UpdateCreatorProfileRequest
from .service import CreatorService

router = APIRouter(tags=['creators'])

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
CreatorUser = Annotated[AuthenticatedUser, Depends(require_role('comedian', 'venue'))]
Service = Annotated[CreatorService, Depends(get_service)]


@router.get('/creators/me', response_model=CreatorPublicSchema)
def get_my_creator_profile(user: CreatorUser, service: Service) -> CreatorPublicSchema:
    return CreatorPublicSchema.from_domain(service.get_me(user))


@router.put('/creators/me', response_model=CreatorPublicSchema)
def update_my_creator_profile(
    body: UpdateCreatorProfileRequest,
    user: CreatorUser,
    service: Service,
) -> CreatorPublicSchema:
    creator = service.update_me(
        user,
        name=body.name,
        bio=body.bio,
        genres=tuple(body.genres),
        address=body.address,
        capacity=body.capacity,
        latitude=body.latitude,
        longitude=body.longitude,
    )
    return CreatorPublicSchema.from_domain(creator)


@router.get('/creators/{creator_id}', response_model=CreatorPublicSchema)
def get_creator(creator_id: str, user: CurrentUser, service: Service) -> CreatorPublicSchema:
    return CreatorPublicSchema.from_domain(service.get_public(creator_id))
