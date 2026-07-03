from __future__ import annotations

from .base import CacheBackend
from .memory import MemoryCache
from .redis import RedisCache


def create_cache(redis_url: str) -> CacheBackend:
    """Build the best available cache backend.

    Falls back to an in-process cache when Redis is not configured or the
    ``redis`` client cannot be imported.
    """

    if not redis_url:
        return MemoryCache()

    try:
        from redis import Redis
    except Exception:
        return MemoryCache()

    try:
        client = Redis.from_url(redis_url)
    except Exception:
        return MemoryCache()

    return RedisCache(client=client, fallback=MemoryCache())
