from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

from location.models.domain import (
    DiscoveryRegion,
    DiscoveryRegionCenter,
    PlaceType,
    ResolvedPlace,
)


def region(region_id: str, name: str, region_type: PlaceType) -> DiscoveryRegion:
    return DiscoveryRegion(
        id=region_id,
        name=name,
        type=region_type,
        center=DiscoveryRegionCenter(lat=51.5, lng=-0.1),
    )


def resolved_city(population: int | None, place_id: str = 'city-1', name: str = 'London') -> ResolvedPlace:
    return ResolvedPlace(
        id=place_id,
        name=name,
        type=PlaceType.CITY,
        population=population,
        center=DiscoveryRegionCenter(lat=51.5, lng=-0.1),
    )


@dataclass(slots=True)
class FakePlaceRepository:
    city: ResolvedPlace | None = None
    children: list[DiscoveryRegion] = field(default_factory=list)
    nearby: list[DiscoveryRegion] = field(default_factory=list)

    def resolve_city(self, latitude: float, longitude: float) -> ResolvedPlace | None:
        return self.city

    def list_children(
        self, place_id: str, types: Sequence[PlaceType], limit: int = 12
    ) -> list[DiscoveryRegion]:
        allowed = set(types)
        return [region for region in self.children if region.type in allowed][:limit]

    def list_nearby_cities(
        self, latitude: float, longitude: float, radius_meters: int, limit: int = 6
    ) -> list[DiscoveryRegion]:
        return self.nearby[:limit]


@dataclass(slots=True)
class FakeInventoryProvider:
    per_region: dict[str, int] = field(default_factory=dict)
    default_count: int = 0

    def count_for_place(self, place_id: str) -> int:
        return self.per_region.get(place_id, self.default_count)

    def counts_for_regions(self, regions: list[DiscoveryRegion]) -> dict[str, int]:
        return {r.id: self.per_region.get(r.id, self.default_count) for r in regions}
