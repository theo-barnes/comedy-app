from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from .memory import MemoryCache

if TYPE_CHECKING:
    from redis import Redis


@dataclass(slots=True)
class RedisCache:
    """Redis-backed cache that falls back to an in-process cache on failure.

    Any Redis connectivity error degrades to the local :class:`MemoryCache`
    so discovery never fails purely because Redis is unavailable.
    """

    client: 'Redis'
    fallback: MemoryCache

    def get(self, key: str) -> str | None:
        try:
            value = self.client.get(key)
        except Exception:
            return self.fallback.get(key)
        if value is None:
            return None
        return value.decode('utf-8') if isinstance(value, bytes) else str(value)

    def set(self, key: str, value: str, ttl_seconds: int) -> None:
        self.fallback.set(key, value, ttl_seconds)
        try:
            self.client.set(key, value, ex=ttl_seconds)
        except Exception:
            # Local fallback already holds the value.
            return

    def delete(self, key: str) -> None:
        self.fallback.delete(key)
        try:
            self.client.delete(key)
        except Exception:
            return
