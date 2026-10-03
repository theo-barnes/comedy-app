"""Generic request rate limiting, backed by the shared CacheBackend."""

from __future__ import annotations

import time
from collections.abc import Callable
from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from shared.auth import AuthenticatedUser, get_current_user
from shared.cache.base import CacheBackend
from shared.errors import RateLimitedError

# Module-level so FastAPI can resolve the (string, PEP 563) annotation from this module's globals.
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]


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


@lru_cache(maxsize=None)
def get_rate_limiter(limit: int, window_seconds: int) -> RateLimiter:
    """One RateLimiter (and cache client) per distinct (limit, window) pair, reused across routes.

    Use this directly (instead of `rate_limited`) when a limit only applies conditionally
    within a route body (e.g. only for one request-body variant).
    """

    from shared.cache import create_cache
    from shared.config import settings

    return RateLimiter(create_cache(settings.redis_url), limit=limit, window_seconds=window_seconds)


def rate_limited(key: str, *, limit: int, window_seconds: int):  # noqa: ANN201 - FastAPI dependency factory
    """FastAPI dependency factory: rate-limit a route per authenticated user under `key`.

    Pass the same `key` to multiple routes (e.g. follow + unfollow) to share one bucket.
    """

    def dependency(user: CurrentUser) -> None:
        get_rate_limiter(limit, window_seconds).check(f'{key}:{user.user_id}')

    return dependency

