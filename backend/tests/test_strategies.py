from __future__ import annotations

from location.models.domain import PlaceType
from location.strategies import (
    DiscoveryContext,
    LargeCityStrategy,
    MegaCityStrategy,
    MidCityStrategy,
    SmallCityStrategy,
)

from .fakes import FakeInventoryProvider, FakePlaceRepository, region, resolved_city


def _context(
    repository: FakePlaceRepository,
    inventory: FakeInventoryProvider | None = None,
    min_inventory: int = 25,
) -> DiscoveryContext:
    return DiscoveryContext(
        place=repository.city or resolved_city(1_000_000),
        latitude=51.5,
        longitude=-0.1,
        repository=repository,
        inventory=inventory or FakeInventoryProvider(),
        nearby_city_radius_meters=75_000,
        min_inventory_for_neighbourhoods=min_inventory,
    )


def test_mega_city_returns_borough_cluster() -> None:
    repo = FakePlaceRepository(
        city=resolved_city(9_000_000),
        children=[region('camden', 'Camden', PlaceType.BOROUGH)],
    )
    result = MegaCityStrategy().discover(_context(repo))
    assert result.scope_type == 'borough_cluster'
    assert result.regions[0].name == 'Camden'


def test_mega_city_falls_back_to_nearby_when_no_children() -> None:
    repo = FakePlaceRepository(
        city=resolved_city(9_000_000),
        children=[],
        nearby=[region('reading', 'Reading', PlaceType.CITY)],
    )
    result = MegaCityStrategy().discover(_context(repo))
    assert result.scope_type == 'nearby_cities'
    assert result.regions[0].name == 'Reading'


def test_large_city_returns_neighbourhood_cluster() -> None:
    repo = FakePlaceRepository(
        city=resolved_city(1_500_000),
        children=[region('soho', 'Soho', PlaceType.NEIGHBOURHOOD)],
    )
    result = LargeCityStrategy().discover(_context(repo))
    assert result.scope_type == 'neighbourhood_cluster'


def test_mid_city_prefers_neighbourhoods_with_enough_inventory() -> None:
    repo = FakePlaceRepository(
        city=resolved_city(300_000),
        children=[region('jewellery', 'Jewellery Quarter', PlaceType.NEIGHBOURHOOD)],
        nearby=[region('coventry', 'Coventry', PlaceType.CITY)],
    )
    inventory = FakeInventoryProvider(per_region={'jewellery': 40})
    result = MidCityStrategy().discover(_context(repo, inventory, min_inventory=25))
    assert result.scope_type == 'neighbourhood_cluster'


def test_mid_city_widens_to_nearby_when_inventory_thin() -> None:
    repo = FakePlaceRepository(
        city=resolved_city(300_000),
        children=[region('jewellery', 'Jewellery Quarter', PlaceType.NEIGHBOURHOOD)],
        nearby=[region('coventry', 'Coventry', PlaceType.CITY)],
    )
    inventory = FakeInventoryProvider(per_region={'jewellery': 3})
    result = MidCityStrategy().discover(_context(repo, inventory, min_inventory=25))
    assert result.scope_type == 'nearby_cities'
    assert result.regions[0].name == 'Coventry'


def test_small_city_includes_home_city() -> None:
    repo = FakePlaceRepository(
        city=resolved_city(40_000, place_id='bath', name='Bath'),
        nearby=[region('bristol', 'Bristol', PlaceType.CITY)],
    )
    result = SmallCityStrategy().discover(_context(repo))
    assert result.scope_type == 'nearby_cities'
    assert result.regions[0].id == 'bath'
    assert any(r.name == 'Bristol' for r in result.regions)
