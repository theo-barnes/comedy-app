from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class CreatorType(str, Enum):
    COMEDIAN = 'comedian'
    VENUE = 'venue'


@dataclass(frozen=True, slots=True)
class ComedianProfile:
    user_id: str
    stage_name: str
    bio: str | None = None
    genres: tuple[str, ...] = ()
    verified: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class VenueProfile:
    user_id: str
    venue_name: str
    bio: str | None = None
    address: str | None = None
    capacity: int | None = None
    place_id: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    verified: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class CreatorPublic:
    """Role-agnostic public view of a creator, for profile pages and feeds."""

    user_id: str
    creator_type: CreatorType
    name: str
    bio: str | None = None
    genres: tuple[str, ...] = ()
    address: str | None = None
    capacity: int | None = None
    verified: bool = True

    @staticmethod
    def from_comedian(profile: ComedianProfile) -> 'CreatorPublic':
        return CreatorPublic(
            user_id=profile.user_id,
            creator_type=CreatorType.COMEDIAN,
            name=profile.stage_name,
            bio=profile.bio,
            genres=profile.genres,
            verified=profile.verified,
        )

    @staticmethod
    def from_venue(profile: VenueProfile) -> 'CreatorPublic':
        return CreatorPublic(
            user_id=profile.user_id,
            creator_type=CreatorType.VENUE,
            name=profile.venue_name,
            bio=profile.bio,
            address=profile.address,
            capacity=profile.capacity,
            verified=profile.verified,
        )
