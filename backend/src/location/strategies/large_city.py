from __future__ import annotations

from dataclasses import dataclass

from ..models.domain import PlaceType
from .base import DiscoveryContext, DiscoveryResult


@dataclass(slots=True)
class LargeCityStrategy:
    """Large cities: prefer neighbourhoods, falling back to boroughs."""

    def discover(self, context: DiscoveryContext) -> DiscoveryResult:
        neighbourhoods = context.repository.list_children(
            context.place.id,
            types=(PlaceType.NEIGHBOURHOOD, PlaceType.BOROUGH),
            limit=context.child_limit,
        )
        if neighbourhoods:
            return DiscoveryResult(scope_type='neighbourhood_cluster', regions=neighbourhoods)

        nearby = context.repository.list_nearby_cities(
            context.latitude,
            context.longitude,
            radius_meters=context.nearby_city_radius_meters,
            limit=context.nearby_city_limit,
        )
        return DiscoveryResult(scope_type='nearby_cities', regions=nearby)
