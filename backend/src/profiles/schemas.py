"""Wire schema for public account identity."""

from __future__ import annotations

from pydantic import BaseModel

from .models.domain import PublicProfile


class PublicProfileSchema(BaseModel):
    """The fields a signed-in viewer may see for another account."""

    id: str
    displayName: str

    @staticmethod
    def from_domain(profile: PublicProfile) -> 'PublicProfileSchema':
        return PublicProfileSchema(id=profile.user_id, displayName=profile.display_name)