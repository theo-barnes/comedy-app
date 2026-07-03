from __future__ import annotations

from dataclasses import dataclass

from ..models.domain import PlaceType
from .base import DiscoveryContext, DiscoveryResult


@dataclass(slots=True)
class MegaCityStrategy:
    """Mega cities: always drill down to boroughs and neighbourhoods."""

    def discover(self, context: DiscoveryContext) -> DiscoveryResult:
        regions = context.repository.list_children(
            context.place.id,
            types=(PlaceType.BOROUGH, PlaceType.NEIGHBOURHOOD),
            limit=context.child_limit,
        )
        if regions:
            return DiscoveryResult(scope_type='borough_cluster', regions=regions)

        nearby = context.repository.list_nearby_cities(
            context.latitude,
            context.longitude,
            radius_meters=context.nearby_city_radius_meters,
            limit=context.nearby_city_limit,
        )
        return DiscoveryResult(scope_type='nearby_cities', regions=nearby)
