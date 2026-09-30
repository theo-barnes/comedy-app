"""API request/response schemas for the discovery-regions endpoint."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# Extended scope vocabulary reflecting the richer strategy set.
ScopeType = Literal[
    'borough_cluster',
    'neighbourhood_cluster',
    'city_cluster',
    'nearby_cities',
]

RegionType = Literal['country', 'region', 'metro', 'city', 'borough', 'neighbourhood']


class DiscoveryRegionCenterSchema(BaseModel):
    """Wire schema for a region's centroid."""

    lat: float = Field(..., description='Latitude in WGS84')
    lng: float = Field(..., description='Longitude in WGS84')


class DiscoveryRegionSchema(BaseModel):
    """Wire schema for a single discovery region."""

    id: str
    name: str
    type: RegionType
    center: DiscoveryRegionCenterSchema


class DiscoveryRegionsResponse(BaseModel):
    """Wire schema for the /discovery-regions endpoint response."""

    scopeType: ScopeType
    regions: list[DiscoveryRegionSchema]
