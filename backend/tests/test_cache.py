from __future__ import annotations

from shared.cache import MemoryCache, make_discovery_cache_key
from shared.cache.redis import RedisCache


def test_memory_cache_set_get() -> None:
    cache = MemoryCache()
    cache.set('k', 'v', ttl_seconds=60)
    assert cache.get('k') == 'v'


def test_memory_cache_missing_key() -> None:
    assert MemoryCache().get('absent') is None


def test_h3_key_is_stable_within_cell() -> None:
    a = make_discovery_cache_key(51.5074, -0.1278, resolution=7)
    b = make_discovery_cache_key(51.5076, -0.1279, resolution=7)
    assert a == b
    assert a.startswith('discovery:7:')


class _BrokenRedis:
    def get(self, key: str):  # noqa: ANN001
        raise RuntimeError('redis down')

    def set(self, key: str, value: str, ex: int):  # noqa: ANN001
        raise RuntimeError('redis down')

    def delete(self, key: str):  # noqa: ANN001
        raise RuntimeError('redis down')


def test_redis_cache_falls_back_on_failure() -> None:
    cache = RedisCache(client=_BrokenRedis(), fallback=MemoryCache())
    cache.set('k', 'v', ttl_seconds=60)
    # Redis get raises, so fallback memory value is returned.
    assert cache.get('k') == 'v'
