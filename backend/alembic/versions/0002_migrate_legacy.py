"""migrate legacy discovery data into places and drop old tables

Revision ID: 0002_migrate_legacy
Revises: 0001_place_hierarchy
Create Date: 2026-07-01

Backfills ``places`` + ``place_hierarchy`` from the legacy ``cities`` and
``neighbourhoods`` tables, then drops the density-tile based schema.

City boundaries are not migrated (they lived in the density tiles and were not
FK-linked); city resolution degrades to nearest-city until the new hierarchy
ingest is re-run to populate boundaries, H3 indexes and upper tiers.
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = '0002_migrate_legacy'
down_revision: str | None = '0001_place_hierarchy'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _legacy_tables_exist() -> bool:
    bind = op.get_bind()
    result = bind.exec_driver_sql(
        "select to_regclass('public.cities') is not null "
        "and to_regclass('public.neighbourhoods') is not null"
    ).scalar()
    return bool(result)


def upgrade() -> None:
    if _legacy_tables_exist():
        # Synthesized country places (deterministic ids from country_code).
        op.execute(
            """
            insert into public.places (id, name, type, country_code, center)
            select
              md5('country:' || country_code)::uuid,
              country_code,
              'country',
              country_code,
              st_centroid(st_collect(center))
            from public.cities
            group by country_code
            on conflict (id) do nothing
            """
        )

        # Cities (reuse legacy ids for continuity).
        op.execute(
            """
            insert into public.places
              (id, name, type, country_code, parent_id, population, center)
            select
              c.id,
              c.name,
              'city',
              c.country_code,
              md5('country:' || c.country_code)::uuid,
              c.population,
              c.center
            from public.cities c
            on conflict (id) do nothing
            """
        )

        # Neighbourhoods / boroughs (reuse legacy ids, keep boundaries).
        op.execute(
            """
            insert into public.places
              (id, name, type, country_code, parent_id, boundary, center)
            select
              n.id,
              n.name,
              n.region_type,
              c.country_code,
              n.city_id,
              n.geom,
              st_centroid(n.geom)
            from public.neighbourhoods n
            join public.cities c on c.id = n.city_id
            on conflict (id) do nothing
            """
        )

        # Closure table: self rows for every migrated place.
        op.execute(
            """
            insert into public.place_hierarchy (ancestor_id, descendant_id, depth)
            select id, id, 0 from public.places
            on conflict (ancestor_id, descendant_id) do nothing
            """
        )

        # country -> city (depth 1).
        op.execute(
            """
            insert into public.place_hierarchy (ancestor_id, descendant_id, depth)
            select p.parent_id, p.id, 1
            from public.places p
            where p.type = 'city' and p.parent_id is not null
            on conflict (ancestor_id, descendant_id) do nothing
            """
        )

        # city -> neighbourhood (depth 1) and country -> neighbourhood (depth 2).
        op.execute(
            """
            insert into public.place_hierarchy (ancestor_id, descendant_id, depth)
            select p.parent_id, p.id, 1
            from public.places p
            where p.type in ('borough', 'neighbourhood') and p.parent_id is not null
            on conflict (ancestor_id, descendant_id) do nothing
            """
        )
        op.execute(
            """
            insert into public.place_hierarchy (ancestor_id, descendant_id, depth)
            select city.parent_id, nb.id, 2
            from public.places nb
            join public.places city on city.id = nb.parent_id
            where nb.type in ('borough', 'neighbourhood')
              and city.parent_id is not null
            on conflict (ancestor_id, descendant_id) do nothing
            """
        )

    # Drop the legacy density-based schema.
    op.execute('drop table if exists public.discovery_density_tiles')
    op.execute('drop table if exists public.neighbourhoods')
    op.execute('drop table if exists public.cities')


def downgrade() -> None:
    # Recreates the legacy structure (empty). Migrated data is not restored.
    op.execute(
        """
        create table if not exists public.cities (
          id uuid primary key default gen_random_uuid(),
          name text not null,
          country_code text not null,
          metro_area text,
          population bigint,
          population_density numeric,
          center geometry(point, 4326) not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (name, country_code)
        )
        """
    )
    op.execute(
        """
        create table if not exists public.neighbourhoods (
          id uuid primary key default gen_random_uuid(),
          city_id uuid not null references public.cities (id) on delete cascade,
          name text not null,
          region_type text not null check (region_type in ('neighbourhood', 'borough')),
          population_density numeric,
          geom geometry(multipolygon, 4326) not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (city_id, name)
        )
        """
    )
    op.execute(
        """
        create table if not exists public.discovery_density_tiles (
          id uuid primary key default gen_random_uuid(),
          density numeric not null,
          geom geometry(polygon, 4326) not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
        """
    )
