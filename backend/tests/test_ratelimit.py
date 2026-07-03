from __future__ import annotations

import pytest

from shared.cache.memory import MemoryCache
from shared.errors import RateLimitedError
from shared.ratelimit import RateLimiter


class _Clock:
    def __init__(self, value: float = 1_000.0) -> None:
        self.value = value

    def __call__(self) -> float:
        return self.value


def test_allows_up_to_limit() -> None:
    limiter = RateLimiter(MemoryCache(), limit=3, window_seconds=60, clock=_Clock())
    assert limiter.allow('k') is True
    assert limiter.allow('k') is True
    assert limiter.allow('k') is True
    assert limiter.allow('k') is False


def test_window_rollover_resets_count() -> None:
    clock = _Clock(1_000.0)
    limiter = RateLimiter(MemoryCache(), limit=1, window_seconds=60, clock=clock)
    assert limiter.allow('k') is True
    assert limiter.allow('k') is False
    clock.value += 60
    assert limiter.allow('k') is True


def test_keys_are_independent() -> None:
    limiter = RateLimiter(MemoryCache(), limit=1, window_seconds=60, clock=_Clock())
    assert limiter.allow('a') is True
    assert limiter.allow('b') is True


def test_check_raises_when_exhausted() -> None:
    limiter = RateLimiter(MemoryCache(), limit=1, window_seconds=60, clock=_Clock())
    limiter.check('k')
    with pytest.raises(RateLimitedError):
        limiter.check('k')
