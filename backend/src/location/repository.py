from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from sqlalchemy import text
from sqlalchemy.orm import Session

from .models.domain import (
    DiscoveryRegion,
    DiscoveryRegionCenter,
    PlaceType,
    ResolvedPlace,
)


class PlaceRepository(Protocol):
    def resolve_city(self, latitude: float, longitude: float) -> ResolvedPlace | None: ...

    def list_children(
        self, place_id: str, types: Sequence[PlaceType], limit: int = 12
    ) -> list[DiscoveryRegion]: ...

    def list_nearby_cities(
        self, latitude: float, longitude: float, radius_meters: int, limit: int = 6
    ) -> list[DiscoveryRegion]: ...


@dataclass(slots=True)
class EmptyPlaceRepository:
    """No-op repository used when no database is configured (bootstrapping)."""

    def resolve_city(self, latitude: float, longitude: float) -> ResolvedPlace | None:
        return None

    def list_children(
        self, place_id: str, types: Sequence[PlaceType], limit: int = 12
    ) -> list[DiscoveryRegion]:
        return []

    def list_nearby_cities(
        self, latitude: float, longitude: float, radius_meters: int, limit: int = 6
    ) -> list[DiscoveryRegion]:
        return []


@dataclass(slots=True)
class PostGISPlaceRepository:
    """PostGIS-backed place lookups using spatial containment and proximity."""

    session_factory: 'type'  # sessionmaker[Session]

    def resolve_city(self, latitude: float, longitude: float) -> ResolvedPlace | None:
        query = text(
            """
            select
              id::text,
              name,
              type,
              population,
              st_y(center) as lat,
              st_x(center) as lng
            from places
            where type = 'city'
              and boundary is not null
              and st_contains(
                boundary,
                st_setsrid(st_makepoint(:lng, :lat), 4326)
              )
            order by coalesce(population, 0) desc
            limit 1
            """
        )
        with self.session_factory() as session:  # type: Session
            row = session.execute(query, {'lat': latitude, 'lng': longitude}).first()

        if row is None:
            return self._resolve_nearest_city(latitude, longitude)

        return ResolvedPlace(
            id=str(row[0]),
            name=str(row[1]),
            type=PlaceType(row[2]),
            population=None if row[3] is None else int(row[3]),
            center=DiscoveryRegionCenter(lat=float(row[4]), lng=float(row[5])),
        )

    def _resolve_nearest_city(self, latitude: float, longitude: float) -> ResolvedPlace | None:
        query = text(
            """
            select
              id::text,
              name,
              type,
              population,
              st_y(center) as lat,
              st_x(center) as lng
            from places
            where type = 'city'
            order by center <-> st_setsrid(st_makepoint(:lng, :lat), 4326)
            limit 1
            """
        )
        with self.session_factory() as session:  # type: Session
            row = session.execute(query, {'lat': latitude, 'lng': longitude}).first()

        if row is None:
            return None

        return ResolvedPlace(
            id=str(row[0]),
            name=str(row[1]),
            type=PlaceType(row[2]),
            population=None if row[3] is None else int(row[3]),
            center=DiscoveryRegionCenter(lat=float(row[4]), lng=float(row[5])),
        )

    def list_children(
        self, place_id: str, types: Sequence[PlaceType], limit: int = 12
    ) -> list[DiscoveryRegion]:
        if not types:
            return []

        query = text(
            """
            select
              p.id::text,
              p.name,
              p.type,
              st_y(st_centroid(coalesce(p.boundary, p.center))) as lat,
              st_x(st_centroid(coalesce(p.boundary, p.center))) as lng
            from place_hierarchy h
            join places p on p.id = h.descendant_id
            where h.ancestor_id = :place_id
              and h.depth > 0
              and p.type = any(:types)
            order by coalesce(p.population, 0) desc, p.name asc
            limit :limit
            """
        )
        with self.session_factory() as session:  # type: Session
            rows = session.execute(
                query,
                {'place_id': place_id, 'types': [t.value for t in types], 'limit': limit},
            ).all()

        return [self._to_region(row) for row in rows]

    def list_nearby_cities(
        self, latitude: float, longitude: float, radius_meters: int, limit: int = 6
    ) -> list[DiscoveryRegion]:
        query = text(
            """
            select
              id::text,
              name,
              type,
              st_y(center) as lat,
              st_x(center) as lng
            from places
            where type = 'city'
              and st_dwithin(
                center::geography,
                st_setsrid(st_makepoint(:lng, :lat), 4326)::geography,
                :radius
              )
            order by center <-> st_setsrid(st_makepoint(:lng, :lat), 4326)
            limit :limit
            """
        )
        with self.session_factory() as session:  # type: Session
            rows = session.execute(
                query,
                {'lat': latitude, 'lng': longitude, 'radius': radius_meters, 'limit': limit},
            ).all()

        return [self._to_region(row) for row in rows]

    @staticmethod
    def _to_region(row: Sequence[object]) -> DiscoveryRegion:
        return DiscoveryRegion(
            id=str(row[0]),
            name=str(row[1]),
            type=PlaceType(str(row[2])),
            center=DiscoveryRegionCenter(lat=float(row[3]), lng=float(row[4])),
        )
