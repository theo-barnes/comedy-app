from __future__ import annotations

from dataclasses import dataclass

from .models import DiscoveryRegionsResponse
from .repositories import DiscoveryRegionRepository


@dataclass(slots=True)
class DiscoveryRegionService:
    repository: DiscoveryRegionRepository
    high_density_threshold: float = 2500.0
    nearby_city_radius_km: float = 75.0

    def get_regions(self, latitude: float, longitude: float) -> DiscoveryRegionsResponse:
        density = self.repository.get_population_density(latitude, longitude)
        neighbourhoods = self.repository.list_neighbourhoods(latitude, longitude)
        cities = self.repository.list_nearby_cities(
            latitude,
            longitude,
            radius_meters=int(self.nearby_city_radius_km * 1000),
        )

        if density is not None and density >= self.high_density_threshold and neighbourhoods:
            return DiscoveryRegionsResponse(scopeType='neighbourhood_cluster', regions=neighbourhoods)

        if cities:
            return DiscoveryRegionsResponse(scopeType='city_cluster', regions=cities)

        return DiscoveryRegionsResponse(scopeType='city_cluster', regions=neighbourhoods[:4])