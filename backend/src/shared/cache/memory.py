from __future__ import annotations

from dataclasses import dataclass, field
from time import monotonic


@dataclass(slots=True)
class _Entry:
    value: str
    expires_at: float


@dataclass(slots=True)
class MemoryCache:
    """In-process TTL cache used as the default backend and Redis fallback."""

    _entries: dict[str, _Entry] = field(default_factory=dict)

    def get(self, key: str) -> str | None:
        entry = self._entries.get(key)
        if entry is None:
            return None
        if entry.expires_at <= monotonic():
            self._entries.pop(key, None)
            return None
        return entry.value

    def set(self, key: str, value: str, ttl_seconds: int) -> None:
        self._entries[key] = _Entry(value=value, expires_at=monotonic() + ttl_seconds)

    def delete(self, key: str) -> None:
        self._entries.pop(key, None)
