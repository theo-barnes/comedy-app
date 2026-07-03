from __future__ import annotations

from dataclasses import dataclass

from ..models.domain import PlaceType
from ..scoring import InventorySignal, has_sufficient_inventory
from .base import DiscoveryContext, DiscoveryResult


@dataclass(slots=True)
class MidCityStrategy:
    """Mid-sized cities: choose neighbourhoods vs nearby cities by inventory.

    If the city has enough local content, surface neighbourhoods; otherwise
    widen discovery to nearby cities so the feed is not sparse.
    """

    def discover(self, context: DiscoveryContext) -> DiscoveryResult:
        neighbourhoods = context.repository.list_children(
            context.place.id,
            types=(PlaceType.NEIGHBOURHOOD, PlaceType.BOROUGH),
            limit=context.child_limit,
        )

        counts = context.inventory.counts_for_regions(neighbourhoods)
        signal = InventorySignal(
            total_listings=sum(counts.values()),
            region_count=len(neighbourhoods),
        )

        if neighbourhoods and has_sufficient_inventory(
            signal, context.min_inventory_for_neighbourhoods
        ):
            return DiscoveryResult(scope_type='neighbourhood_cluster', regions=neighbourhoods)

        nearby = context.repository.list_nearby_cities(
            context.latitude,
            context.longitude,
            radius_meters=context.nearby_city_radius_meters,
            limit=context.nearby_city_limit,
        )
        if nearby:
            return DiscoveryResult(scope_type='nearby_cities', regions=nearby)

        # No nearby inventory either: fall back to whatever local regions exist.
        return DiscoveryResult(scope_type='neighbourhood_cluster', regions=neighbourhoods)
