from __future__ import annotations

from fastapi import FastAPI, Query

from .cache import DiscoveryResponseCache, make_cache_key
from .repositories import create_repository
from .services import DiscoveryRegionService
from .settings import settings

app = FastAPI(title='Discovery Regions API', version='0.1.0')

repository = create_repository(settings.database_url)
service = DiscoveryRegionService(
    repository=repository,
    high_density_threshold=settings.high_density_threshold,
    nearby_city_radius_km=settings.nearby_city_radius_km,
)
cache = DiscoveryResponseCache(settings.cache_ttl_seconds)


@app.get('/discovery-regions')
def get_discovery_regions(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    cache_key = make_cache_key(lat, lng)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    response = service.get_regions(lat, lng)
    cache.set(cache_key, response)
    return response