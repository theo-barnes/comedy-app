"""Public account identity use cases."""

from __future__ import annotations

from shared.errors import NotFoundError

from .models.domain import PublicProfile
from .repository import PublicProfileRepository


class PublicProfileService:
    """Retrieves an account's limited public identity."""

    def __init__(self, repository: PublicProfileRepository) -> None:
        self._repository = repository

    def get_public_profile(self, user_id: str) -> PublicProfile:
        profile = self._repository.get_public_profile(user_id)
        if profile is None:
            raise NotFoundError('profile not found')
        return profile