-- Geospatial discovery foundation

create extension if not exists postgis;

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
);

create index if not exists cities_center_gix on public.cities using gist (center);
create index if not exists cities_density_idx on public.cities (population_density);

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
);

create index if not exists neighbourhoods_geom_gix on public.neighbourhoods using gist (geom);
create index if not exists neighbourhoods_density_idx on public.neighbourhoods (population_density);

create table if not exists public.discovery_density_tiles (
  id uuid primary key default gen_random_uuid(),
  density numeric not null,
  geom geometry(polygon, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discovery_density_tiles_geom_gix on public.discovery_density_tiles using gist (geom);
create index if not exists discovery_density_tiles_density_idx on public.discovery_density_tiles (density);