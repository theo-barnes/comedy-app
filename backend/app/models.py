from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

DiscoveryRegionType = Literal['city', 'neighbourhood', 'borough']
DiscoveryScopeType = Literal['city_cluster', 'neighbourhood_cluster']


class DiscoveryRegionCenter(BaseModel):
    lat: float = Field(..., description='Latitude in WGS84')
    lng: float = Field(..., description='Longitude in WGS84')


class DiscoveryRegion(BaseModel):
    id: str
    name: str
    type: DiscoveryRegionType
    center: DiscoveryRegionCenter


class DiscoveryRegionsResponse(BaseModel):
    scopeType: DiscoveryScopeType
    regions: list[DiscoveryRegion]