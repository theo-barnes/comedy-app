from __future__ import annotations

from collections.abc import Callable
from typing import Protocol

from sqlalchemy import text

from shared.cache.base import CacheBackend

# Sentinel stored in cache for "profile exists but role is null".
_NULL_ROLE = '__none__'


class RoleResolver(Protocol):
    def resolve(self, user_id: str) -> str | None: ...


def db_role_fetcher(session_factory: Callable[[], object]) -> Callable[[str], str | None]:
    """Build a fetch function that reads the app role from public.profiles."""

    def fetch(user_id: str) -> str | None:
        session = session_factory()
        try:
            row = session.execute(  # type: ignore[attr-defined]
                text('SELECT role FROM public.profiles WHERE id = :uid'),
                {'uid': user_id},
            ).first()
        finally:
            session.close()  # type: ignore[attr-defined]
        if row is None:
            return None
        return row[0]

    return fetch


class CachingRoleResolver:
    """Resolves a user's app role with a short-TTL cache in front of the DB."""

    def __init__(
        self,
        fetch: Callable[[str], str | None],
        cache: CacheBackend,
        ttl_seconds: int = 60,
    ) -> None:
        self._fetch = fetch
        self._cache = cache
        self._ttl = ttl_seconds

    def resolve(self, user_id: str) -> str | None:
        key = f'auth:role:{user_id}'
        cached = self._cache.get(key)
        if cached is not None:
            return None if cached == _NULL_ROLE else cached
        role = self._fetch(user_id)
        self._cache.set(key, role if role is not None else _NULL_ROLE, self._ttl)
        return role

    def invalidate(self, user_id: str) -> None:
        self._cache.delete(f'auth:role:{user_id}')
