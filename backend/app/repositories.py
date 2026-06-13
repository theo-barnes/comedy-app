from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

try:
    from psycopg_pool import ConnectionPool
except Exception:  # pragma: no cover - optional while bootstrapping
    ConnectionPool = object  # type: ignore[assignment]

from .models import DiscoveryRegion, DiscoveryRegionCenter


class DiscoveryRegionRepository(Protocol):
    def get_population_density(self, latitude: float, longitude: float) -> float | None: ...

    def list_neighbourhoods(self, latitude: float, longitude: float, limit: int = 8) -> list[DiscoveryRegion]: ...

    def list_nearby_cities(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int = 75_000,
        limit: int = 4,
    ) -> list[DiscoveryRegion]: ...


@dataclass(slots=True)
class EmptyDiscoveryRegionRepository:
    def get_population_density(self, latitude: float, longitude: float) -> float | None:
        return None

    def list_neighbourhoods(self, latitude: float, longitude: float, limit: int = 8) -> list[DiscoveryRegion]:
        return []

    def list_nearby_cities(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int = 75_000,
        limit: int = 4,
    ) -> list[DiscoveryRegion]:
        return []


@dataclass(slots=True)
class PostGISDiscoveryRegionRepository:
    pool: ConnectionPool

    def get_population_density(self, latitude: float, longitude: float) -> float | None:
        query = """
            select density
            from discovery_density_tiles
            where st_contains(
              geom,
              st_setsrid(st_makepoint(%s, %s), 4326)
            )
            limit 1
        """
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, (longitude, latitude))
                row = cursor.fetchone()

        return None if row is None else float(row[0])

    def list_neighbourhoods(self, latitude: float, longitude: float, limit: int = 8) -> list[DiscoveryRegion]:
        query = """
            select
              id::text,
              name,
              region_type,
              st_y(st_centroid(geom)) as lat,
              st_x(st_centroid(geom)) as lng
            from neighbourhoods
                        where
                            st_contains(
                                geom,
                                st_setsrid(st_makepoint(%s, %s), 4326)
                            )
                            or st_dwithin(
                                geom::geography,
                                st_setsrid(st_makepoint(%s, %s), 4326)::geography,
                                10000
                            )
                        order by
                            st_contains(
                                geom,
                                st_setsrid(st_makepoint(%s, %s), 4326)
                            ) desc,
                            st_distance(
                                st_centroid(geom)::geography,
                                st_setsrid(st_makepoint(%s, %s), 4326)::geography
                            ) asc,
                            population_density desc nulls last
            limit %s
        """
        return self._fetch_regions(
            query,
            (
                longitude,
                latitude,
                longitude,
                latitude,
                longitude,
                latitude,
                longitude,
                latitude,
                limit,
            ),
        )

    def list_nearby_cities(
        self,
        latitude: float,
        longitude: float,
        radius_meters: int = 75_000,
        limit: int = 4,
    ) -> list[DiscoveryRegion]:
        query = """
            select
              id::text,
              name,
              'city' as region_type,
              st_y(center) as lat,
              st_x(center) as lng
            from cities
            where st_dwithin(
              center::geography,
              st_setsrid(st_makepoint(%s, %s), 4326)::geography,
              %s
            )
            order by st_distance(
              center::geography,
              st_setsrid(st_makepoint(%s, %s), 4326)::geography
            ) asc
            limit %s
        """
        return self._fetch_regions(query, (longitude, latitude, radius_meters, longitude, latitude, limit))

    def _fetch_regions(self, query: str, params: tuple[object, ...]) -> list[DiscoveryRegion]:
        with self.pool.connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(query, params)
                rows = cursor.fetchall()

        regions: list[DiscoveryRegion] = []
        for row in rows:
            region_id, name, region_type, lat, lng = row
            regions.append(
                DiscoveryRegion(
                    id=str(region_id),
                    name=str(name),
                    type=str(region_type),
                    center=DiscoveryRegionCenter(lat=float(lat), lng=float(lng)),
                )
            )
        return regions


def create_repository(database_url: str) -> DiscoveryRegionRepository:
    if not database_url:
        return EmptyDiscoveryRegionRepository()

    return PostGISDiscoveryRegionRepository(ConnectionPool(database_url))