from __future__ import annotations

from shared.auth.models import AuthenticatedUser
from shared.errors import NotFoundError, PermissionDeniedError, ValidationFailedError

from .models.domain import ComedianProfile, CreatorPublic, CreatorType, VenueProfile
from .repository import CreatorRepository


class CreatorService:
    def __init__(self, repository: CreatorRepository) -> None:
        self._repository = repository

    def get_me(self, user: AuthenticatedUser) -> CreatorPublic:
        creator = self._repository.get_creator(user.user_id)
        if creator is None:
            raise NotFoundError('creator profile not set up yet')
        return creator

    def update_me(
        self,
        user: AuthenticatedUser,
        *,
        name: str,
        bio: str | None = None,
        genres: tuple[str, ...] = (),
        address: str | None = None,
        capacity: int | None = None,
        latitude: float | None = None,
        longitude: float | None = None,
    ) -> CreatorPublic:
        if user.role == CreatorType.COMEDIAN.value:
            profile = self._repository.upsert_comedian(
                ComedianProfile(
                    user_id=user.user_id,
                    stage_name=name,
                    bio=bio,
                    genres=genres,
                )
            )
            return CreatorPublic.from_comedian(profile)
        if user.role == CreatorType.VENUE.value:
            if (latitude is None) != (longitude is None):
                raise ValidationFailedError('latitude and longitude must be provided together')
            venue = self._repository.upsert_venue(
                VenueProfile(
                    user_id=user.user_id,
                    venue_name=name,
                    bio=bio,
                    address=address,
                    capacity=capacity,
                    latitude=latitude,
                    longitude=longitude,
                )
            )
            return CreatorPublic.from_venue(venue)
        raise PermissionDeniedError('only comedians and venues have creator profiles')

    def get_public(self, creator_id: str) -> CreatorPublic:
        creator = self._repository.get_creator(creator_id)
        if creator is None:
            raise NotFoundError('creator not found')
        return creator
