from __future__ import annotations

import time
from typing import Any

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

from shared.auth.dependencies import get_current_user, get_optional_user, require_role
from shared.auth.factory import AuthComponents, set_auth
from shared.auth.models import AuthenticatedUser
from shared.auth.roles import CachingRoleResolver
from shared.auth.verifier import StaticKeyTokenVerifier, TokenVerificationError
from shared.cache.memory import MemoryCache
from shared.errors import PermissionDeniedError, UnauthorizedError

AUDIENCE = 'authenticated'
ISSUER = 'https://example.supabase.co/auth/v1'


@pytest.fixture(scope='module')
def keypair() -> tuple[ec.EllipticCurvePrivateKey, ec.EllipticCurvePublicKey]:
    private_key = ec.generate_private_key(ec.SECP256R1())
    return private_key, private_key.public_key()


def _token(
    private_key: ec.EllipticCurvePrivateKey,
    *,
    sub: str = 'user-123',
    aud: str = AUDIENCE,
    iss: str = ISSUER,
    exp_offset: int = 300,
    **extra: Any,
) -> str:
    payload: dict[str, Any] = {
        'sub': sub,
        'aud': aud,
        'iss': iss,
        'exp': int(time.time()) + exp_offset,
        **extra,
    }
    return jwt.encode(payload, private_key, algorithm='ES256')


def _verifier(public_key: ec.EllipticCurvePublicKey) -> StaticKeyTokenVerifier:
    return StaticKeyTokenVerifier(public_key, audience=AUDIENCE, issuer=ISSUER)


class TestStaticKeyTokenVerifier:
    def test_valid_token(self, keypair) -> None:
        private_key, public_key = keypair
        token = _token(private_key, email='a@b.com')
        claims = _verifier(public_key).verify(token)
        assert claims.user_id == 'user-123'
        assert claims.email == 'a@b.com'

    def test_expired_token_rejected(self, keypair) -> None:
        private_key, public_key = keypair
        token = _token(private_key, exp_offset=-10)
        with pytest.raises(TokenVerificationError):
            _verifier(public_key).verify(token)

    def test_wrong_audience_rejected(self, keypair) -> None:
        private_key, public_key = keypair
        token = _token(private_key, aud='service_role')
        with pytest.raises(TokenVerificationError):
            _verifier(public_key).verify(token)

    def test_wrong_issuer_rejected(self, keypair) -> None:
        private_key, public_key = keypair
        token = _token(private_key, iss='https://evil.example.com')
        with pytest.raises(TokenVerificationError):
            _verifier(public_key).verify(token)

    def test_wrong_key_rejected(self, keypair) -> None:
        private_key, _ = keypair
        other_public = ec.generate_private_key(ec.SECP256R1()).public_key()
        token = _token(private_key)
        with pytest.raises(TokenVerificationError):
            _verifier(other_public).verify(token)

    def test_missing_sub_rejected(self, keypair) -> None:
        private_key, public_key = keypair
        payload = {'aud': AUDIENCE, 'iss': ISSUER, 'exp': int(time.time()) + 300}
        token = jwt.encode(payload, private_key, algorithm='ES256')
        with pytest.raises(TokenVerificationError):
            _verifier(public_key).verify(token)


class TestCachingRoleResolver:
    def test_fetches_then_caches(self) -> None:
        calls: list[str] = []

        def fetch(user_id: str) -> str | None:
            calls.append(user_id)
            return 'comedian'

        resolver = CachingRoleResolver(fetch, MemoryCache(), ttl_seconds=60)
        assert resolver.resolve('u1') == 'comedian'
        assert resolver.resolve('u1') == 'comedian'
        assert calls == ['u1']

    def test_caches_null_role(self) -> None:
        calls: list[str] = []

        def fetch(user_id: str) -> str | None:
            calls.append(user_id)
            return None

        resolver = CachingRoleResolver(fetch, MemoryCache(), ttl_seconds=60)
        assert resolver.resolve('u1') is None
        assert resolver.resolve('u1') is None
        assert calls == ['u1']

    def test_invalidate_forces_refetch(self) -> None:
        roles = iter(['fan', 'comedian'])

        def fetch(user_id: str) -> str | None:
            return next(roles)

        resolver = CachingRoleResolver(fetch, MemoryCache(), ttl_seconds=60)
        assert resolver.resolve('u1') == 'fan'
        resolver.invalidate('u1')
        assert resolver.resolve('u1') == 'comedian'


class _FixedRoleResolver:
    def __init__(self, role: str | None) -> None:
        self._role = role

    def resolve(self, user_id: str) -> str | None:
        return self._role


class _Credentials:
    def __init__(self, token: str) -> None:
        self.credentials = token


@pytest.fixture()
def auth_setup(keypair):
    private_key, public_key = keypair

    def install(role: str | None) -> ec.EllipticCurvePrivateKey:
        set_auth(
            AuthComponents(
                verifier=_verifier(public_key),
                role_resolver=_FixedRoleResolver(role),
            )
        )
        return private_key

    yield install
    set_auth(None)


class TestDependencies:
    def test_get_current_user(self, auth_setup) -> None:
        private_key = auth_setup('fan')
        token = _token(private_key, email='fan@example.com')
        user = get_current_user(_Credentials(token))
        assert user == AuthenticatedUser(user_id='user-123', email='fan@example.com', role='fan')

    def test_missing_credentials_rejected(self, auth_setup) -> None:
        auth_setup('fan')
        with pytest.raises(UnauthorizedError):
            get_current_user(None)

    def test_invalid_token_rejected(self, auth_setup) -> None:
        auth_setup('fan')
        with pytest.raises(UnauthorizedError):
            get_current_user(_Credentials('garbage'))

    def test_optional_user_none_without_credentials(self, auth_setup) -> None:
        auth_setup('fan')
        assert get_optional_user(None) is None

    def test_require_role_allows_matching(self, auth_setup) -> None:
        private_key = auth_setup('venue')
        token = _token(private_key)
        user = get_current_user(_Credentials(token))
        dependency = require_role('venue', 'comedian')
        assert dependency(user).role == 'venue'

    def test_require_role_rejects_mismatch(self, auth_setup) -> None:
        private_key = auth_setup('fan')
        token = _token(private_key)
        user = get_current_user(_Credentials(token))
        dependency = require_role('venue')
        with pytest.raises(PermissionDeniedError):
            dependency(user)

    def test_require_role_rejects_null_role(self, auth_setup) -> None:
        private_key = auth_setup(None)
        token = _token(private_key)
        user = get_current_user(_Credentials(token))
        dependency = require_role('fan')
        with pytest.raises(PermissionDeniedError):
            dependency(user)
