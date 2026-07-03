from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from .factory import get_service
from .schemas import DiscoveryRegionsResponse
from .service import DiscoveryRegionService

router = APIRouter(tags=['discovery'])


@router.get('/discovery-regions', response_model=DiscoveryRegionsResponse)
def get_discovery_regions(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    service: DiscoveryRegionService = Depends(get_service),
) -> DiscoveryRegionsResponse:
    return service.get_regions(lat, lng)
