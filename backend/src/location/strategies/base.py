from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from ..inventory import InventoryProvider
from ..models.domain import DiscoveryRegion, ResolvedPlace
from ..repository import PlaceRepository
from ..schemas import ScopeType


@dataclass(slots=True, frozen=True)
class DiscoveryContext:
    """Everything a strategy needs to produce discovery regions."""

    place: ResolvedPlace
    latitude: float
    longitude: float
    repository: PlaceRepository
    inventory: InventoryProvider
    nearby_city_radius_meters: int
    min_inventory_for_neighbourhoods: int
    child_limit: int = 12
    nearby_city_limit: int = 6


@dataclass(slots=True, frozen=True)
class DiscoveryResult:
    scope_type: ScopeType
    regions: list[DiscoveryRegion]


class DiscoveryStrategy(Protocol):
    """A pluggable rule for turning a resolved city into discovery regions."""

    def discover(self, context: DiscoveryContext) -> DiscoveryResult: ...
