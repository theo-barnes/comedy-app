from __future__ import annotations

from dataclasses import dataclass

from shared.cache import CacheBackend, make_discovery_cache_key

from .classifier import CityClassifier
from .inventory import InventoryProvider
from .models.domain import DiscoveryRegion
from .repository import PlaceRepository
from .schemas import (
    DiscoveryRegionCenterSchema,
    DiscoveryRegionSchema,
    DiscoveryRegionsResponse,
)
from .strategies import DiscoveryContext, StrategyRegistry


@dataclass(slots=True)
class DiscoveryRegionService:
    """Orchestrates resolve -> classify -> strategy -> cache for discovery."""

    repository: PlaceRepository
    classifier: CityClassifier
    strategies: StrategyRegistry
    inventory: InventoryProvider
    cache: CacheBackend
    cache_ttl_seconds: int
    cache_h3_resolution: int
    nearby_city_radius_meters: int
    min_inventory_for_neighbourhoods: int

    def get_regions(self, latitude: float, longitude: float) -> DiscoveryRegionsResponse:
        cache_key = make_discovery_cache_key(latitude, longitude, self.cache_h3_resolution)

        cached = self._read_cache(cache_key)
        if cached is not None:
            return cached

        response = self._compute(latitude, longitude)
        self._write_cache(cache_key, response)
        return response

    def _compute(self, latitude: float, longitude: float) -> DiscoveryRegionsResponse:
        place = self.repository.resolve_city(latitude, longitude)
        if place is None:
            return DiscoveryRegionsResponse(scopeType='nearby_cities', regions=[])

        market_size = self.classifier.classify(place)
        strategy = self.strategies.get(market_size)

        context = DiscoveryContext(
            place=place,
            latitude=latitude,
            longitude=longitude,
            repository=self.repository,
            inventory=self.inventory,
            nearby_city_radius_meters=self.nearby_city_radius_meters,
            min_inventory_for_neighbourhoods=self.min_inventory_for_neighbourhoods,
        )

        result = strategy.discover(context)
        return DiscoveryRegionsResponse(
            scopeType=result.scope_type,
            regions=[self._to_schema(region) for region in result.regions],
        )

    def _read_cache(self, cache_key: str) -> DiscoveryRegionsResponse | None:
        raw = self.cache.get(cache_key)
        if raw is None:
            return None
        try:
            return DiscoveryRegionsResponse.model_validate_json(raw)
        except Exception:
            return None

    def _write_cache(self, cache_key: str, response: DiscoveryRegionsResponse) -> None:
        self.cache.set(cache_key, response.model_dump_json(), self.cache_ttl_seconds)

    @staticmethod
    def _to_schema(region: DiscoveryRegion) -> DiscoveryRegionSchema:
        return DiscoveryRegionSchema(
            id=region.id,
            name=region.name,
            type=region.type.value,
            center=DiscoveryRegionCenterSchema(lat=region.center.lat, lng=region.center.lng),
        )
