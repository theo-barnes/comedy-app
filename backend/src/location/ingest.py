"""Ingest a full geographic place hierarchy into PostGIS.

Builds Country -> Region -> Metro -> City -> Borough -> Neighbourhood places
from OpenStreetMap (Nominatim + Overpass), maintaining a closure table
(``place_hierarchy``) and an H3 index per place.

Upper tiers (country/region) are stored centroid-first: their boundaries are
optional because national/regional polygons from Nominatim are large and not
required for city-level containment resolution.
"""
from __future__ import annotations

import argparse
import json
import os
import uuid
from dataclasses import dataclass, field
from pathlib import Path

import h3
import psycopg
import requests
from shapely.geometry import MultiPolygon, Polygon, box, shape
from shapely.geometry.base import BaseGeometry

NAMESPACE = uuid.UUID('4cbf9f8f-4f7f-4e6d-a6aa-f5eaeb980f7c')
USER_AGENT = 'comedy-app-geospatial-ingest/2.0'
DEFAULT_H3_RESOLUTION = 7

DEFAULT_CITIES = [
    ('London', 'gb'),
    ('Manchester', 'gb'),
    ('Birmingham', 'gb'),
    ('Glasgow', 'gb'),
    ('Edinburgh', 'gb'),
    ('San Francisco', 'us'),
    ('Oakland', 'us'),
    ('San Jose', 'us'),
    ('Los Angeles', 'us'),
    ('New York', 'us'),
    ('Chicago', 'us'),
]


@dataclass(slots=True)
class PlaceRecord:
    type: str
    name: str
    country_code: str
    center_lat: float
    center_lng: float
    boundary: MultiPolygon | None = None
    population: int | None = None


@dataclass(slots=True)
class CityIngestResult:
    city: PlaceRecord
    country_name: str
    region_name: str | None
    neighbourhoods: list[PlaceRecord] = field(default_factory=list)


def parse_city_specs(raw: str | None) -> list[tuple[str, str]]:
    if not raw:
        return DEFAULT_CITIES

    parsed: list[tuple[str, str]] = []
    for part in raw.split(','):
        chunk = part.strip()
        if not chunk:
            continue
        if ':' not in chunk:
            raise ValueError(f"Invalid city spec '{chunk}'. Expected format Name:cc")
        name, country_code = chunk.split(':', 1)
        parsed.append((name.strip(), country_code.strip().lower()))

    if not parsed:
        raise ValueError('No valid city specs provided')

    return parsed


def build_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({'User-Agent': USER_AGENT})
    return session


# --------------------------------------------------------------------------- #
# Fetching
# --------------------------------------------------------------------------- #


def fetch_city(session: requests.Session, city_name: str, country_code: str) -> CityIngestResult:
    response = session.get(
        'https://nominatim.openstreetmap.org/search',
        params={
            'format': 'jsonv2',
            'polygon_geojson': 1,
            'addressdetails': 1,
            'limit': 5,
            'countrycodes': country_code,
            'q': city_name,
        },
        timeout=60,
    )
    response.raise_for_status()

    payload = response.json()
    if not payload:
        raise RuntimeError(f'Nominatim returned no result for {city_name}:{country_code}')

    candidate, polygon = resolve_city_polygon(payload, city_name, country_code)
    address = candidate.get('address', {}) if isinstance(candidate, dict) else {}
    country_name = str(address.get('country') or country_code.upper())
    region_name = address.get('state') or address.get('region') or address.get('province')

    population = fetch_city_population(session, city_name, country_code)

    city = PlaceRecord(
        type='city',
        name=city_name,
        country_code=country_code.upper(),
        center_lat=float(candidate['lat']),
        center_lng=float(candidate['lon']),
        boundary=MultiPolygon([polygon]),
        population=population,
    )

    return CityIngestResult(
        city=city,
        country_name=country_name,
        region_name=str(region_name) if region_name else None,
    )


def resolve_city_polygon(
    payload: list[dict[str, object]], city_name: str, country_code: str
) -> tuple[dict[str, object], Polygon]:
    for candidate in payload:
        geojson = candidate.get('geojson')
        if geojson is None:
            continue

        geometry = shape(geojson)
        if isinstance(geometry, (Polygon, MultiPolygon)):
            return candidate, largest_polygon(geometry)

    first = payload[0]
    boundingbox = first.get('boundingbox')
    if isinstance(boundingbox, list) and len(boundingbox) == 4:
        south, north, west, east = [float(value) for value in boundingbox]
        return first, box(west, south, east, north)

    raise TypeError(f'Unsupported geometry type for city boundary: {city_name}:{country_code}')


def fetch_city_population(session: requests.Session, city_name: str, country_code: str) -> int | None:
    where = f'name like "{city_name}" and country_code = "{country_code.upper()}"'
    response = session.get(
        'https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/'
        'geonames-all-cities-with-a-population-1000/records',
        params={'where': where, 'order_by': 'population desc', 'limit': 1},
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()
    results = payload.get('results', [])
    if not results:
        return None
    pop = results[0].get('population')
    return int(pop) if pop is not None else None


def fetch_neighbourhoods(
    session: requests.Session,
    city: PlaceRecord,
    max_results: int,
    overpass_url: str,
) -> list[PlaceRecord]:
    if max_results <= 0 or city.boundary is None:
        return []

    minx, miny, maxx, maxy = city.boundary.bounds
    overpass_query = f"""
[out:json][timeout:60];
(
  way["boundary"="administrative"]["admin_level"~"8|9|10|11"]({miny},{minx},{maxy},{maxx});
  way["place"~"borough|suburb|neighbourhood|quarter"]({miny},{minx},{maxy},{maxx});
);
out tags geom;
""".strip()

    try:
        response = session.get(overpass_url, params={'data': overpass_query}, timeout=90)
        response.raise_for_status()
        payload = response.json()
    except Exception as exc:  # pragma: no cover - network failure path
        print(f'warning: overpass fetch failed ({exc}); continuing without neighbourhoods')
        return []

    out: list[PlaceRecord] = []
    seen_names: set[str] = set()

    for element in payload.get('elements', []):
        tags = element.get('tags', {})
        name = (tags.get('name') or '').strip()
        if not name:
            continue

        lower_name = name.lower()
        if lower_name in seen_names:
            continue

        geometry = element.get('geometry')
        if not geometry:
            continue

        polygon = overpass_way_to_polygon(geometry)
        if polygon is None or polygon.is_empty or not polygon.intersects(city.boundary):
            continue

        region_type = (
            'borough'
            if tags.get('place') == 'borough' or tags.get('admin_level') == '8'
            else 'neighbourhood'
        )
        centroid = polygon.centroid
        out.append(
            PlaceRecord(
                type=region_type,
                name=name,
                country_code=city.country_code,
                center_lat=float(centroid.y),
                center_lng=float(centroid.x),
                boundary=MultiPolygon([polygon]),
            )
        )
        seen_names.add(lower_name)

        if len(out) >= max_results:
            break

    return out


def overpass_way_to_polygon(points: list[dict[str, float]]) -> Polygon | None:
    coords = [(point['lon'], point['lat']) for point in points]
    if len(coords) < 3:
        return None

    if coords[0] != coords[-1]:
        coords.append(coords[0])

    if len(coords) < 4:
        return None

    polygon = Polygon(coords)
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
    raise TypeError(f'Unsupported geometry type for city boundary: {geometry.geom_type}')


# --------------------------------------------------------------------------- #
# Persistence
# --------------------------------------------------------------------------- #


def load_database_url() -> str:
    from_env = os.getenv('DISCOVERY_DATABASE_URL')
    if from_env:
        return from_env

    env_path = Path(__file__).resolve().parents[2] / '.env'
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith('DISCOVERY_DATABASE_URL='):
                return line.split('=', 1)[1].strip()

    raise RuntimeError('DISCOVERY_DATABASE_URL not found in environment or backend/.env')


def geom_to_json(geometry: BaseGeometry) -> str:
    return json.dumps(geometry.__geo_interface__)


def place_id_for(place_type: str, country_code: str, name: str, parent_key: str) -> uuid.UUID:
    return uuid.uuid5(NAMESPACE, f'{place_type}:{country_code}:{parent_key}:{name.lower()}')


def h3_for(lat: float, lng: float, resolution: int) -> str:
    return h3.latlng_to_cell(lat, lng, resolution)


def upsert_place(
    cursor: psycopg.Cursor,
    place: PlaceRecord,
    place_id: uuid.UUID,
    parent_id: uuid.UUID | None,
    h3_resolution: int,
) -> None:
    boundary_sql = 'null'
    params: list[object] = [
        str(place_id),
        place.name,
        place.type,
        place.country_code,
        None if parent_id is None else str(parent_id),
        place.population,
        h3_for(place.center_lat, place.center_lng, h3_resolution),
    ]

    if place.boundary is not None:
        boundary_sql = 'st_multi(st_collectionextract(st_setsrid(st_geomfromgeojson(%s), 4326), 3))'
        params.append(geom_to_json(place.boundary))

    params.extend([place.center_lng, place.center_lat])

    cursor.execute(
        f"""
        insert into public.places
          (id, name, type, country_code, parent_id, population, h3_index, boundary, center)
        values (
          %s, %s, %s, %s, %s, %s, %s,
          {boundary_sql},
          st_setsrid(st_makepoint(%s, %s), 4326)
        )
        on conflict (id) do update set
          name = excluded.name,
          type = excluded.type,
          country_code = excluded.country_code,
          parent_id = excluded.parent_id,
          population = excluded.population,
          h3_index = excluded.h3_index,
          boundary = coalesce(excluded.boundary, public.places.boundary),
          center = excluded.center,
          updated_at = now()
        """,
        params,
    )


def upsert_hierarchy(cursor: psycopg.Cursor, place_id: uuid.UUID, ancestor_ids: list[uuid.UUID]) -> None:
    """Insert closure rows for ``place_id``.

    ``ancestor_ids`` is ordered from the topmost ancestor down to the immediate
    parent. Self-reference (depth 0) is always written.
    """

    rows: list[tuple[str, str, int]] = [(str(place_id), str(place_id), 0)]
    total = len(ancestor_ids)
    for index, ancestor_id in enumerate(ancestor_ids):
        depth = total - index
        rows.append((str(ancestor_id), str(place_id), depth))

    cursor.executemany(
        """
        insert into public.place_hierarchy (ancestor_id, descendant_id, depth)
        values (%s, %s, %s)
        on conflict (ancestor_id, descendant_id) do update set depth = excluded.depth
        """,
        rows,
    )


def persist_city(
    cursor: psycopg.Cursor,
    result: CityIngestResult,
    h3_resolution: int,
) -> tuple[uuid.UUID, int]:
    city = result.city

    # Country (centroid-first: reuse city centroid as an approximation).
    country_id = place_id_for('country', city.country_code, result.country_name, 'root')
    country = PlaceRecord(
        type='country',
        name=result.country_name,
        country_code=city.country_code,
        center_lat=city.center_lat,
        center_lng=city.center_lng,
    )
    upsert_place(cursor, country, country_id, None, h3_resolution)
    upsert_hierarchy(cursor, country_id, [])
    ancestors: list[uuid.UUID] = [country_id]

    # Region (optional).
    region_id: uuid.UUID | None = None
    if result.region_name:
        region_id = place_id_for('region', city.country_code, result.region_name, result.country_name.lower())
        region = PlaceRecord(
            type='region',
            name=result.region_name,
            country_code=city.country_code,
            center_lat=city.center_lat,
            center_lng=city.center_lng,
        )
        upsert_place(cursor, region, region_id, country_id, h3_resolution)
        upsert_hierarchy(cursor, region_id, ancestors)
        ancestors = [country_id, region_id]

    # City.
    parent_key = (result.region_name or result.country_name).lower()
    city_id = place_id_for('city', city.country_code, city.name, parent_key)
    parent_id = region_id or country_id
    upsert_place(cursor, city, city_id, parent_id, h3_resolution)
    upsert_hierarchy(cursor, city_id, ancestors)
    city_ancestors = [*ancestors, city_id]

    # Neighbourhoods / boroughs.
    inserted = 0
    child_ids: list[uuid.UUID] = []
    for child in result.neighbourhoods:
        child_id = place_id_for(child.type, city.country_code, child.name, city.name.lower())
        upsert_place(cursor, child, child_id, city_id, h3_resolution)
        upsert_hierarchy(cursor, child_id, city_ancestors)
        child_ids.append(child_id)
        inserted += 1

    if child_ids:
        cursor.execute(
            """
            delete from public.places
            where parent_id = %s
              and type in ('borough', 'neighbourhood')
              and not (id = any(%s::uuid[]))
            """,
            (str(city_id), [str(item) for item in child_ids]),
        )

    return city_id, inserted


def run_ingest(
    city_specs: list[tuple[str, str]],
    max_neighbourhoods: int,
    overpass_url: str,
    h3_resolution: int,
    dry_run: bool,
) -> None:
    db_url = load_database_url()
    session = build_session()

    with psycopg.connect(db_url) as connection:
        with connection.cursor() as cursor:
            for city_name, country_code in city_specs:
                result = fetch_city(session, city_name, country_code)
                result.neighbourhoods = fetch_neighbourhoods(
                    session=session,
                    city=result.city,
                    max_results=max_neighbourhoods,
                    overpass_url=overpass_url,
                )

                city_id, inserted = persist_city(cursor, result, h3_resolution)

                print(
                    'ingested city='
                    f'{result.city.name} '
                    f'country={result.country_name} '
                    f'region={result.region_name or "-"} '
                    f'population={result.city.population} '
                    f'children={inserted} '
                    f'city_id={city_id}'
                )

            if dry_run:
                connection.rollback()
                print('dry-run complete: transaction rolled back')
            else:
                connection.commit()
                print('ingestion complete: committed to database')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Ingest a place hierarchy into Supabase/PostGIS')
    parser.add_argument('--cities', default=None, help='Comma-separated city specs Name:cc')
    parser.add_argument('--max-neighbourhoods', type=int, default=100)
    parser.add_argument('--overpass-url', default='https://overpass.kumi.systems/api/interpreter')
    parser.add_argument('--h3-resolution', type=int, default=DEFAULT_H3_RESOLUTION)
    parser.add_argument('--dry-run', action='store_true')
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    run_ingest(
        city_specs=parse_city_specs(args.cities),
        max_neighbourhoods=args.max_neighbourhoods,
        overpass_url=args.overpass_url,
        h3_resolution=args.h3_resolution,
        dry_run=args.dry_run,
    )


if __name__ == '__main__':
    main()
