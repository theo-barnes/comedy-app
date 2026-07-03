from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum


class PlaceType(StrEnum):
    """Ordered levels of the geographic place hierarchy.

    The declaration order encodes containment: a ``COUNTRY`` contains a
    ``REGION`` which contains a ``METRO`` and so on down to ``NEIGHBOURHOOD``.
    """

    COUNTRY = 'country'
    REGION = 'region'
    METRO = 'metro'
    CITY = 'city'
    BOROUGH = 'borough'
    NEIGHBOURHOOD = 'neighbourhood'


class MarketSize(StrEnum):
    """Coarse commercial classification of a city used by discovery strategies."""

    MEGA = 'mega'
    LARGE = 'large'
    MID = 'mid'
    SMALL = 'small'


@dataclass(slots=True, frozen=True)
class DiscoveryRegionCenter:
    lat: float
    lng: float


@dataclass(slots=True, frozen=True)
class DiscoveryRegion:
    id: str
    name: str
    type: PlaceType
    center: DiscoveryRegionCenter


@dataclass(slots=True, frozen=True)
class ResolvedPlace:
    """A place resolved from client coordinates with its classification inputs."""

    id: str
    name: str
    type: PlaceType
    population: int | None
    center: DiscoveryRegionCenter
