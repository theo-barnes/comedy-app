from __future__ import annotations

from location.classifier import CityClassifier, ClassificationThresholds
from location.inventory import StubInventoryProvider
from location.service import DiscoveryRegionService
from location.strategies import StrategyRegistry
from shared.cache import MemoryCache

from .fakes import FakePlaceRepository, region, resolved_city
from location.models.domain import PlaceType

THRESHOLDS = ClassificationThresholds(
    mega_city_population=5_000_000,
    large_city_population=1_000_000,
    mid_city_population=250_000,
)


def _service(repository: FakePlaceRepository, cache: MemoryCache | None = None) -> DiscoveryRegionService:
    return DiscoveryRegionService(
        repository=repository,
        classifier=CityClassifier(thresholds=THRESHOLDS),
        strategies=StrategyRegistry(),
        inventory=StubInventoryProvider(),
        cache=cache or MemoryCache(),
        cache_ttl_seconds=300,
        cache_h3_resolution=7,
        nearby_city_radius_meters=75_000,
        min_inventory_for_neighbourhoods=25,
    )


def test_returns_empty_when_no_city_resolved() -> None:
    service = _service(FakePlaceRepository(city=None))
    response = service.get_regions(0.0, 0.0)
    assert response.scopeType == 'nearby_cities'
    assert response.regions == []


def test_mega_city_end_to_end() -> None:
    repo = FakePlaceRepository(
        city=resolved_city(9_000_000),
        children=[region('camden', 'Camden', PlaceType.BOROUGH)],
    )
    response = _service(repo).get_regions(51.5, -0.1)
    assert response.scopeType == 'borough_cluster'
    assert response.regions[0].name == 'Camden'


def test_response_is_cached() -> None:
    cache = MemoryCache()
    repo = FakePlaceRepository(
        city=resolved_city(9_000_000),
        children=[region('camden', 'Camden', PlaceType.BOROUGH)],
    )
    service = _service(repo, cache=cache)

    first = service.get_regions(51.5, -0.1)

    # Mutate the repository; a cached hit should ignore the change.
    repo.children = []
    second = service.get_regions(51.5, -0.1)

    assert first.model_dump() == second.model_dump()
