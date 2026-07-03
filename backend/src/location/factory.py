from __future__ import annotations

from functools import lru_cache

from shared.cache import create_cache
from shared.config import settings

from .classifier import CityClassifier, ClassificationThresholds
from .inventory import InventoryProvider, StubInventoryProvider
from .repository import EmptyPlaceRepository, PlaceRepository, PostGISPlaceRepository
from .service import DiscoveryRegionService
from .strategies import StrategyRegistry


def build_repository() -> PlaceRepository:
    if not settings.database_url:
        return EmptyPlaceRepository()

    from shared.database import get_sessionmaker

    return PostGISPlaceRepository(session_factory=get_sessionmaker())


def _build_inventory() -> InventoryProvider:
    if not settings.database_url:
        return StubInventoryProvider()

    from content.inventory import ContentInventoryProvider
    from shared.database import get_sessionmaker

    return ContentInventoryProvider(session_factory=get_sessionmaker())


@lru_cache(maxsize=1)
def get_service() -> DiscoveryRegionService:
    """Assemble the discovery service from configuration (singleton)."""

    classifier = CityClassifier(
        thresholds=ClassificationThresholds(
            mega_city_population=settings.mega_city_population,
            large_city_population=settings.large_city_population,
            mid_city_population=settings.mid_city_population,
        )
    )

    return DiscoveryRegionService(
        repository=build_repository(),
        classifier=classifier,
        strategies=StrategyRegistry(),
        inventory=_build_inventory(),
        cache=create_cache(settings.redis_url),
        cache_ttl_seconds=settings.cache_ttl_seconds,
        cache_h3_resolution=settings.cache_h3_resolution,
        nearby_city_radius_meters=int(settings.nearby_city_radius_km * 1000),
        min_inventory_for_neighbourhoods=settings.min_inventory_for_neighbourhoods,
    )
