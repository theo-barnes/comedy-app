from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_prefix='DISCOVERY_')

    database_url: str = ''
    cache_ttl_seconds: int = 300
    high_density_threshold: float = 2500.0
    nearby_city_radius_km: float = 75.0


settings = Settings()