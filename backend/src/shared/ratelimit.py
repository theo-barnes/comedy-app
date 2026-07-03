from __future__ import annotations

import time
from collections.abc import Callable

from shared.cache.base import CacheBackend
from shared.errors import RateLimitedError


class RateLimiter:
    """Fixed-window rate limiter backed by any CacheBackend.

    Best-effort: the read-modify-write is not atomic, which is acceptable
    for abuse protection at this scale.
    """

    def __init__(
        self,
        cache: CacheBackend,
        limit: int,
        window_seconds: int = 60,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self._cache = cache
        self._limit = limit
        self._window = window_seconds
        self._clock = clock

    def allow(self, key: str) -> bool:
        window = int(self._clock() // self._window)
        cache_key = f'ratelimit:{key}:{window}'
        current = int(self._cache.get(cache_key) or 0)
        if current >= self._limit:
            return False
        self._cache.set(cache_key, str(current + 1), self._window)
        return True

    def check(self, key: str) -> None:
        if not self.allow(key):
            raise RateLimitedError('too many requests')
