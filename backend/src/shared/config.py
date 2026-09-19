from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration for the location domain.

    Environment variables are prefixed with ``DISCOVERY_`` to preserve
    compatibility with the previous service (e.g. ``DISCOVERY_DATABASE_URL``).
    """

    model_config = SettingsConfigDict(env_file='.env', env_prefix='DISCOVERY_', extra='ignore')

    # Runtime
    environment: str = 'development'
    log_level: str = 'INFO'
    sentry_dsn: str = ''
    sentry_traces_sample_rate: float = 0.1
    cors_origins: str = ''  # comma-separated; empty disables CORS middleware

    # Auth (Supabase JWT verification via JWKS; requires asymmetric keys)
    supabase_url: str = ''
    supabase_jwks_url: str = ''  # overrides the URL derived from supabase_url
    supabase_jwt_issuer: str = ''  # overrides the issuer derived from supabase_url
    supabase_jwt_audience: str = 'authenticated'
    auth_role_cache_ttl_seconds: int = 60

    # Rate limiting
    rate_limit_per_minute: int = 120

    # Media (Cloudflare Stream; stub provider is used when unset)
    cloudflare_account_id: str = ''
    cloudflare_api_token: str = ''
    cloudflare_stream_webhook_secret: str = ''
    max_video_duration_seconds: int = 300
    max_video_size_bytes: int = 500 * 1024 * 1024
    max_active_uploads_per_creator: int = 2
    content_h3_resolution: int = 9

    # Database
    database_url: str = ''

    # Cache
    redis_url: str = ''
    cache_ttl_seconds: int = 300
    cache_h3_resolution: int = 7

    # Discovery classification thresholds (population)
    mega_city_population: int = 5_000_000
    large_city_population: int = 1_000_000
    mid_city_population: int = 250_000

    # Discovery geometry
    nearby_city_radius_km: float = 75.0
    neighbourhood_search_radius_km: float = 10.0

    # Inventory scoring
    min_inventory_for_neighbourhoods: int = 25

    # Feed
    feed_page_size: int = 20
    feed_cache_ttl_seconds: int = 300
    feed_candidate_limit: int = 200
    feed_h3_ring_k: int = 2
    feed_weight_location: float = 0.25
    feed_weight_creator_affinity: float = 0.20
    feed_weight_watch_completion: float = 0.20
    feed_weight_engagement: float = 0.15
    feed_weight_event_conversion: float = 0.10
    feed_weight_freshness: float = 0.10


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
