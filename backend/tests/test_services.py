from __future__ import annotations

from dataclasses import dataclass

from app.models import DiscoveryRegion, DiscoveryRegionCenter
from app.services import DiscoveryRegionService


@dataclass(slots=True)
class FakeRepository:
    density: float | None
    neighbourhoods: list[DiscoveryRegion]
    cities: list[DiscoveryRegion]

    def get_population_density(self, latitude: float, longitude: float) -> float | None:
        return self.density

    def list_neighbourhoods(self, latitude: float, longitude: float, limit: int = 8) -> list[DiscoveryRegion]:
        return self.neighbourhoods

    def list_nearby_cities(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int = 75_000,
        limit: int = 4,
    ) -> list[DiscoveryRegion]:
        return self.cities


def region(region_id: str, name: str, region_type: str) -> DiscoveryRegion:
    return DiscoveryRegion(
        id=region_id,
        name=name,
        type=region_type,  # type: ignore[arg-type]
        center=DiscoveryRegionCenter(lat=51.5, lng=-0.1),
    )


def test_prefers_neighbourhoods_in_dense_areas() -> None:
    service = DiscoveryRegionService(
        repository=FakeRepository(
            density=3000,
            neighbourhoods=[region('camden', 'Camden', 'neighbourhood')],
            cities=[region('london', 'London', 'city')],
        )
    )

    response = service.get_regions(51.5, -0.1)

    assert response.scopeType == 'neighbourhood_cluster'
    assert response.regions[0].name == 'Camden'


def test_falls_back_to_city_cluster_when_density_is_low() -> None:
    service = DiscoveryRegionService(
        repository=FakeRepository(
            density=1000,
            neighbourhoods=[region('soho', 'Soho', 'neighbourhood')],
            cities=[region('southampton', 'Southampton', 'city')],
        )
    )

    response = service.get_regions(50.9, -1.4)

    assert response.scopeType == 'city_cluster'
    assert response.regions[0].name == 'Southampton'