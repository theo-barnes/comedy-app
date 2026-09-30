"""Wires up the process-wide auth singleton (token verifier + role resolver) from settings."""

from __future__ import annotations

from dataclasses import dataclass

from shared.auth.roles import CachingRoleResolver, RoleResolver, db_role_fetcher
from shared.auth.verifier import JwksTokenVerifier, TokenVerifier, UnconfiguredTokenVerifier
from shared.cache.factory import create_cache
from shared.config import settings


@dataclass(slots=True)
class AuthComponents:
    """The verifier + role resolver pair used by shared.auth.dependencies."""

    verifier: TokenVerifier
    role_resolver: RoleResolver


_components: AuthComponents | None = None


def _build() -> AuthComponents:
    """Derive JWKS URL/issuer from settings (falling back to the Supabase project URL
    convention) and fall back to an always-reject verifier when auth isn't configured.
    """

    jwks_url = settings.supabase_jwks_url
    if not jwks_url and settings.supabase_url:
        jwks_url = f'{settings.supabase_url.rstrip("/")}/auth/v1/.well-known/jwks.json'

    verifier: TokenVerifier
    if jwks_url:
        issuer = settings.supabase_jwt_issuer
        if not issuer and settings.supabase_url:
            issuer = f'{settings.supabase_url.rstrip("/")}/auth/v1'
        verifier = JwksTokenVerifier(
            jwks_url,
            audience=settings.supabase_jwt_audience,
            issuer=issuer or None,
        )
    else:
        verifier = UnconfiguredTokenVerifier()

    cache = create_cache(settings.redis_url)

    if settings.database_url:
        from shared.database import get_sessionmaker

        fetch = db_role_fetcher(get_sessionmaker())
    else:

        def fetch(user_id: str) -> str | None:
            return None

    resolver = CachingRoleResolver(fetch, cache, ttl_seconds=settings.auth_role_cache_ttl_seconds)
    return AuthComponents(verifier=verifier, role_resolver=resolver)


def get_auth() -> AuthComponents:
    global _components
    if _components is None:
        _components = _build()
    return _components


def set_auth(components: AuthComponents | None) -> None:
    """Override auth components (tests) or reset to lazy rebuild with None."""

    global _components
    _components = components
