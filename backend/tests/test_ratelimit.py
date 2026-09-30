from __future__ import annotations

import pytest

from shared.auth.models import AuthenticatedUser
from shared.cache.memory import MemoryCache
from shared.errors import RateLimitedError
from shared.ratelimit import RateLimiter, get_rate_limiter, rate_limited


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


# ---------------------------------------------------------------- get_rate_limiter / rate_limited


def test_get_rate_limiter_reuses_instance_for_same_params() -> None:
    assert get_rate_limiter(917, 6101) is get_rate_limiter(917, 6101)


def test_get_rate_limiter_distinct_instance_for_different_params() -> None:
    assert get_rate_limiter(918, 6102) is not get_rate_limiter(918, 6103)


def _user(user_id: str) -> AuthenticatedUser:
    return AuthenticatedUser(user_id=user_id, email=None, role='fan')


def test_rate_limited_shares_bucket_across_dependencies_with_same_key() -> None:
    add = rate_limited('rl-toggle', limit=2, window_seconds=6104)
    remove = rate_limited('rl-toggle', limit=2, window_seconds=6104)
    user = _user('user-toggle')

    add(user=user)
    remove(user=user)  # same bucket as `add` (shared key) — second call to either now fails
    with pytest.raises(RateLimitedError):
        add(user=user)


def test_rate_limited_keys_are_independent_per_bucket() -> None:
    bucket_a = rate_limited('rl-a', limit=1, window_seconds=6105)
    bucket_b = rate_limited('rl-b', limit=1, window_seconds=6105)
    user = _user('user-buckets')

    bucket_a(user=user)
    bucket_b(user=user)  # different bucket name, unaffected by bucket_a's usage

