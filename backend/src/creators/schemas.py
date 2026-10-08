"""API request/response schemas for the creators endpoints."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

from .models.domain import CreatorPublic


class UpdateCreatorProfileRequest(BaseModel):
    """Body for PUT /creators/me."""

    name: str = Field(..., min_length=1, max_length=120)
    bio: str | None = Field(None, max_length=2000)
    genres: list[str] = Field(default_factory=list, max_length=10)
    address: str | None = Field(None, max_length=300)
    capacity: int | None = Field(None, ge=1, le=100_000)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)


class CreatorPublicSchema(BaseModel):
    """Wire schema for the public creator view returned by all creators endpoints."""

    id: str
    creatorType: Literal['comedian', 'venue']
    name: str
    bio: str | None = None
    genres: list[str] = Field(default_factory=list)
    address: str | None = None
    capacity: int | None = None
    verified: bool
    latitude: float | None = None
    longitude: float | None = None

    @staticmethod
    def from_domain(creator: CreatorPublic) -> 'CreatorPublicSchema':
        return CreatorPublicSchema(
            id=creator.user_id,
            creatorType=creator.creator_type.value,
            name=creator.name,
            bio=creator.bio,
            genres=list(creator.genres),
            address=creator.address,
            capacity=creator.capacity,
            verified=creator.verified,
            latitude=creator.latitude,
            longitude=creator.longitude,
        )
