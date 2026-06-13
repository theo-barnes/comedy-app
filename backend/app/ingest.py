from __future__ import annotations

import argparse
import json
import os
import uuid
from dataclasses import dataclass
from pathlib import Path

import psycopg
import requests
from shapely.geometry import MultiPolygon, Polygon, box, shape
from shapely.geometry.base import BaseGeometry

NAMESPACE = uuid.UUID("4cbf9f8f-4f7f-4e6d-a6aa-f5eaeb980f7c")
USER_AGENT = "comedy-app-geospatial-ingest/1.0"

DEFAULT_CITIES = [
    ("London", "gb"),
    ("Manchester", "gb"),
    ("Birmingham", "gb"),
    ("Glasgow", "gb"),
    ("Edinburgh", "gb"),
    ("San Francisco", "us"),
    ("Oakland", "us"),
    ("San Jose", "us"),
    ("Los Angeles", "us"),
    ("New York", "us"),
    ("Chicago", "us"),
]


@dataclass(slots=True)
class CityRecord:
    name: str
    country_code: str
    center_lat: float
    center_lng: float
    boundary_geom: Polygon
    population: int | None


@dataclass(slots=True)
class NeighbourhoodRecord:
    name: str
    region_type: str
    geom: MultiPolygon


def parse_city_specs(raw: str | None) -> list[tuple[str, str]]:
    if not raw:
        return DEFAULT_CITIES

    parsed: list[tuple[str, str]] = []
    for part in raw.split(","):
        chunk = part.strip()
        if not chunk:
            continue
        if ":" not in chunk:
            raise ValueError(f"Invalid city spec '{chunk}'. Expected format Name:cc")
        name, country_code = chunk.split(":", 1)
        parsed.append((name.strip(), country_code.strip().lower()))

    if not parsed:
        raise ValueError("No valid city specs provided")

    return parsed


def build_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT})
    return session


def fetch_city_boundary(session: requests.Session, city_name: str, country_code: str) -> CityRecord:
    response = session.get(
        "https://nominatim.openstreetmap.org/search",
        params={
            "format": "jsonv2",
            "polygon_geojson": 1,
            "limit": 5,
            "countrycodes": country_code,
            "q": city_name,
        },
        timeout=60,
    )
    response.raise_for_status()

    payload = response.json()
    if not payload:
        raise RuntimeError(f"Nominatim returned no result for {city_name}:{country_code}")

    first, polygon = resolve_city_polygon(payload, city_name, country_code)

    population = fetch_city_population(session, city_name, country_code)

    return CityRecord(
        name=city_name,
        country_code=country_code.upper(),
        center_lat=float(first["lat"]),
        center_lng=float(first["lon"]),
        boundary_geom=polygon,
        population=population,
    )


def resolve_city_polygon(payload: list[dict[str, object]], city_name: str, country_code: str) -> tuple[dict[str, object], Polygon]:
    for candidate in payload:
        geojson = candidate.get("geojson")
        if geojson is None:
            continue

        geometry = shape(geojson)
        if isinstance(geometry, (Polygon, MultiPolygon)):
            return candidate, largest_polygon(geometry)

    first = payload[0]
    boundingbox = first.get("boundingbox")
    if isinstance(boundingbox, list) and len(boundingbox) == 4:
        south, north, west, east = [float(value) for value in boundingbox]
        # Nominatim boundingbox order is [south, north, west, east].
        return first, box(west, south, east, north)

    raise TypeError(f"Unsupported geometry type for city boundary: {city_name}:{country_code}")


def fetch_city_population(session: requests.Session, city_name: str, country_code: str) -> int | None:
    where = f'name like "{city_name}" and country_code = "{country_code.upper()}"'
    response = session.get(
        "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/geonames-all-cities-with-a-population-1000/records",
        params={
            "where": where,
            "order_by": "population desc",
            "limit": 1,
        },
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    results = payload.get("results", [])
    if not results:
        return None
    pop = results[0].get("population")
    return int(pop) if pop is not None else None


def fetch_neighbourhoods(
    session: requests.Session,
    city_polygon: Polygon,
    max_results: int,
    overpass_url: str,
) -> list[NeighbourhoodRecord]:
    if max_results <= 0:
        return []

    minx, miny, maxx, maxy = city_polygon.bounds
    overpass_query = f"""
[out:json][timeout:60];
(
  way[\"boundary\"=\"administrative\"][\"admin_level\"~\"8|9|10|11\"]({miny},{minx},{maxy},{maxx});
  way[\"place\"~\"borough|suburb|neighbourhood|quarter\"]({miny},{minx},{maxy},{maxx});
);
out tags geom;
""".strip()

    try:
        response = session.get(
            overpass_url,
            params={"data": overpass_query},
            timeout=90,
        )
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:
        print(f"warning: overpass fetch failed ({exc}); continuing without neighbourhood boundaries")
        return []

    out: list[NeighbourhoodRecord] = []
    seen_names: set[str] = set()

    for element in payload.get("elements", []):
        tags = element.get("tags", {})
        name = (tags.get("name") or "").strip()
        if not name:
            continue

        lower_name = name.lower()
        if lower_name in seen_names:
            continue

        geometry = element.get("geometry")
        if not geometry:
            continue

        polygon = overpass_way_to_polygon(geometry)
        if polygon is None or polygon.is_empty:
            continue

        if not polygon.intersects(city_polygon):
            continue

        region_type = "borough" if tags.get("place") == "borough" or tags.get("admin_level") == "8" else "neighbourhood"
        out.append(NeighbourhoodRecord(name=name, region_type=region_type, geom=MultiPolygon([polygon])))
        seen_names.add(lower_name)

        if len(out) >= max_results:
            break

    return out


def overpass_way_to_polygon(points: list[dict[str, float]]) -> Polygon | None:
    coords = [(point["lon"], point["lat"]) for point in points]
    if len(coords) < 3:
        return None

    if coords[0] != coords[-1]:
        coords.append(coords[0])

    if len(coords) < 4:
        return None

    polygon = Polygon(coords)
    if polygon.is_empty:
        return None

    if not polygon.is_valid:
        polygon = polygon.buffer(0)

    if polygon.is_empty:
        return None

    if isinstance(polygon, MultiPolygon):
        return max(polygon.geoms, key=lambda geom: geom.area)

    if not isinstance(polygon, Polygon):
        return None

    return polygon


def largest_polygon(geometry: BaseGeometry) -> Polygon:
    if isinstance(geometry, Polygon):
        return geometry

    if isinstance(geometry, MultiPolygon):
        return max(geometry.geoms, key=lambda geom: geom.area)

    raise TypeError(f"Unsupported geometry type for city boundary: {geometry.geom_type}")


def load_database_url() -> str:
    from_env = os.getenv("DISCOVERY_DATABASE_URL")
    if from_env:
        return from_env

    env_path = Path(__file__).resolve().parents[1] / ".env"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("DISCOVERY_DATABASE_URL="):
                return line.split("=", 1)[1].strip()

    raise RuntimeError("DISCOVERY_DATABASE_URL not found in environment or backend/.env")


def geom_to_json(geometry: BaseGeometry) -> str:
    return json.dumps(geometry.__geo_interface__)


def compute_density(cursor: psycopg.Cursor, polygon: Polygon, population: int | None) -> float | None:
    if population is None or population <= 0:
        return None

    cursor.execute(
        """
        select nullif(st_area(st_setsrid(st_geomfromgeojson(%s), 4326)::geography) / 1000000.0, 0)
        """,
        (geom_to_json(polygon),),
    )
    area_km2 = cursor.fetchone()[0]
    if area_km2 is None:
        return None

    return float(population / area_km2)


def upsert_city(cursor: psycopg.Cursor, city: CityRecord, density: float | None) -> uuid.UUID:
    city_id = uuid.uuid5(NAMESPACE, f"city:{city.country_code}:{city.name.lower()}")
    cursor.execute(
        """
        insert into public.cities (id, name, country_code, population, population_density, center)
        values (
          %s,
          %s,
          %s,
          %s,
          %s,
          st_setsrid(st_makepoint(%s, %s), 4326)
        )
        on conflict (id)
        do update set
          name = excluded.name,
          country_code = excluded.country_code,
          population = excluded.population,
          population_density = excluded.population_density,
          center = excluded.center,
          updated_at = now()
        """,
        (str(city_id), city.name, city.country_code, city.population, density, city.center_lng, city.center_lat),
    )
    return city_id


def upsert_neighbourhoods(
    cursor: psycopg.Cursor,
    city_id: uuid.UUID,
    city_density: float | None,
    neighbourhoods: list[NeighbourhoodRecord],
    city_key: str,
) -> list[uuid.UUID]:
    inserted_ids: list[uuid.UUID] = []

    for neighbourhood in neighbourhoods:
        neighbourhood_id = uuid.uuid5(NAMESPACE, f"neighbourhood:{city_key}:{neighbourhood.name.lower()}")
        cursor.execute(
            """
            insert into public.neighbourhoods (id, city_id, name, region_type, population_density, geom)
            values (
              %s,
              %s,
              %s,
              %s,
              %s,
              st_multi(st_collectionextract(st_setsrid(st_geomfromgeojson(%s), 4326), 3))
            )
            on conflict (city_id, name)
            do update set
              region_type = excluded.region_type,
              population_density = excluded.population_density,
              geom = excluded.geom,
              updated_at = now()
            """,
            (
                str(neighbourhood_id),
                str(city_id),
                neighbourhood.name,
                neighbourhood.region_type,
                city_density,
                geom_to_json(neighbourhood.geom),
            ),
        )
        inserted_ids.append(neighbourhood_id)

    if inserted_ids:
        cursor.execute(
            """
            delete from public.neighbourhoods
            where city_id = %s
              and not (id = any(%s::uuid[]))
            """,
            (str(city_id), [str(item) for item in inserted_ids]),
        )

    return inserted_ids


def upsert_density_tile(cursor: psycopg.Cursor, city_key: str, density: float | None, polygon: Polygon) -> uuid.UUID:
    density_id = uuid.uuid5(NAMESPACE, f"density:{city_key}")

    if density is None:
        cursor.execute("delete from public.discovery_density_tiles where id = %s", (str(density_id),))
        return density_id

    cursor.execute(
        """
        insert into public.discovery_density_tiles (id, density, geom)
        values (
          %s,
          %s,
          st_setsrid(st_geomfromgeojson(%s), 4326)
        )
        on conflict (id)
        do update set
          density = excluded.density,
          geom = excluded.geom,
          updated_at = now()
        """,
        (str(density_id), density, geom_to_json(polygon)),
    )
    return density_id


def run_ingest(
    city_specs: list[tuple[str, str]],
    max_neighbourhoods: int,
    overpass_url: str,
    dry_run: bool,
) -> None:
    db_url = load_database_url()
    session = build_session()

    with psycopg.connect(db_url) as connection:
        with connection.cursor() as cursor:
            for city_name, country_code in city_specs:
                city = fetch_city_boundary(session, city_name, country_code)
                neighbourhoods = fetch_neighbourhoods(
                    session=session,
                    city_polygon=city.boundary_geom,
                    max_results=max_neighbourhoods,
                    overpass_url=overpass_url,
                )
                density = compute_density(cursor, city.boundary_geom, city.population)
                city_key = f"{city.country_code}:{city.name.lower()}"

                city_id = upsert_city(cursor, city, density)
                inserted_neighbourhood_ids = upsert_neighbourhoods(
                    cursor=cursor,
                    city_id=city_id,
                    city_density=density,
                    neighbourhoods=neighbourhoods,
                    city_key=city_key,
                )
                density_id = upsert_density_tile(cursor, city_key, density, city.boundary_geom)

                print(
                    "ingested city="
                    f"{city.name} "
                    f"population={city.population} "
                    f"density={'None' if density is None else round(density, 2)} "
                    f"neighbourhoods={len(inserted_neighbourhood_ids)} "
                    f"city_id={city_id} density_tile_id={density_id}"
                )

            if dry_run:
                connection.rollback()
                print("dry-run complete: transaction rolled back")
            else:
                connection.commit()
                print("ingestion complete: committed to database")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest discovery geospatial data into Supabase/PostGIS")
    parser.add_argument(
        "--cities",
        default=None,
        help="Comma-separated city specs in the format Name:cc (example: London:gb,Manchester:gb)",
    )
    parser.add_argument(
        "--max-neighbourhoods",
        type=int,
        default=100,
        help="Max neighbourhood/borough boundaries to ingest per city",
    )
    parser.add_argument(
        "--overpass-url",
        default="https://overpass.kumi.systems/api/interpreter",
        help="Overpass API interpreter URL",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run ingestion and print results without committing database changes",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    city_specs = parse_city_specs(args.cities)
    run_ingest(
        city_specs=city_specs,
        max_neighbourhoods=args.max_neighbourhoods,
        overpass_url=args.overpass_url,
        dry_run=args.dry_run,
    )


if __name__ == "__main__":
    main()
