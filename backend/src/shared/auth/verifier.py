from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import jwt

_ALGORITHMS = ['ES256', 'RS256']


class TokenVerificationError(Exception):
    """Raised when a bearer token fails verification for any reason."""


@dataclass(frozen=True, slots=True)
class TokenClaims:
    user_id: str
    email: str | None
    claims: dict[str, Any]


class TokenVerifier(Protocol):
    def verify(self, token: str) -> TokenClaims: ...


def _decode(token: str, key: Any, audience: str, issuer: str | None) -> TokenClaims:
    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=_ALGORITHMS,
            audience=audience,
            issuer=issuer,
            options={'require': ['exp', 'sub']},
        )
    except jwt.PyJWTError as exc:
        raise TokenVerificationError(str(exc)) from exc
    return TokenClaims(user_id=str(payload['sub']), email=payload.get('email'), claims=payload)


class JwksTokenVerifier:
    """Verifies Supabase JWTs against the project's JWKS endpoint.

    Requires asymmetric signing keys (ES256/RS256) to be enabled on the
    Supabase project. PyJWKClient caches keys internally.
    """

    def __init__(
        self,
        jwks_url: str,
        audience: str = 'authenticated',
        issuer: str | None = None,
    ) -> None:
        self._client = jwt.PyJWKClient(jwks_url, cache_keys=True)
        self._audience = audience
        self._issuer = issuer

    def verify(self, token: str) -> TokenClaims:
        try:
            key = self._client.get_signing_key_from_jwt(token).key
        except jwt.PyJWTError as exc:
            raise TokenVerificationError(f'unable to resolve signing key: {exc}') from exc
        return _decode(token, key, self._audience, self._issuer)


class StaticKeyTokenVerifier:
    """Verifies tokens against a fixed public key. Used in tests."""

    def __init__(
        self,
        public_key: Any,
        audience: str = 'authenticated',
        issuer: str | None = None,
    ) -> None:
        self._public_key = public_key
        self._audience = audience
        self._issuer = issuer

    def verify(self, token: str) -> TokenClaims:
        return _decode(token, self._public_key, self._audience, self._issuer)


class UnconfiguredTokenVerifier:
    """Placeholder used when auth settings are missing; always rejects."""

    def verify(self, token: str) -> TokenClaims:
        raise TokenVerificationError(
            'auth is not configured: set DISCOVERY_SUPABASE_URL (or DISCOVERY_SUPABASE_JWKS_URL)'
        )
