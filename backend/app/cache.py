from __future__ import annotations

from dataclasses import dataclass
from time import monotonic

from .models import DiscoveryRegionsResponse


def bucket_coordinate(value: float, bucket_size: float = 0.05) -> int:
    return round(value / bucket_size)


def make_cache_key(latitude: float, longitude: float) -> str:
    return f'{bucket_coordinate(latitude)}:{bucket_coordinate(longitude)}'


@dataclass(slots=True)
class CachedResponse:
    expires_at: float
    response: DiscoveryRegionsResponse


class DiscoveryResponseCache:
    def __init__(self, ttl_seconds: int) -> None:
        self._ttl_seconds = ttl_seconds
        self._entries: dict[str, CachedResponse] = {}

    def get(self, cache_key: str) -> DiscoveryRegionsResponse | None:
        entry = self._entries.get(cache_key)
        if entry is None:
            return None

        if entry.expires_at <= monotonic():
            self._entries.pop(cache_key, None)
            return None

        return entry.response

    def set(self, cache_key: str, response: DiscoveryRegionsResponse) -> None:
        self._entries[cache_key] = CachedResponse(
            expires_at=monotonic() + self._ttl_seconds,
            response=response,
        )