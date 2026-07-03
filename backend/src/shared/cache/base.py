from __future__ import annotations

from typing import Protocol


class CacheBackend(Protocol):
    """Minimal string key/value cache with TTL semantics.

    Implementations must be safe to call when the underlying store is
    unavailable: failures should degrade gracefully rather than raise.
    """

    def get(self, key: str) -> str | None: ...

    def set(self, key: str, value: str, ttl_seconds: int) -> None: ...

    def delete(self, key: str) -> None: ...
