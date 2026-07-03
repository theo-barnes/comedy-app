from __future__ import annotations

from dataclasses import dataclass

from ..models.domain import DiscoveryRegion, DiscoveryRegionCenter, PlaceType
from .base import DiscoveryContext, DiscoveryResult


@dataclass(slots=True)
class SmallCityStrategy:
    """Small cities: return nearby cities within the configured radius.

    The resolved city itself is included as the first region so users always
    have a "home" option even when few neighbours exist.
    """

    def discover(self, context: DiscoveryContext) -> DiscoveryResult:
        nearby = context.repository.list_nearby_cities(
            context.latitude,
            context.longitude,
            radius_meters=context.nearby_city_radius_meters,
            limit=context.nearby_city_limit,
        )

        if not any(region.id == context.place.id for region in nearby):
            home = DiscoveryRegion(
                id=context.place.id,
                name=context.place.name,
                type=PlaceType.CITY,
                center=DiscoveryRegionCenter(
                    lat=context.place.center.lat,
                    lng=context.place.center.lng,
                ),
            )
            nearby = [home, *nearby]

        return DiscoveryResult(scope_type='nearby_cities', regions=nearby)
