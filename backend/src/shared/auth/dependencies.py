from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from shared.auth.factory import get_auth
from shared.auth.models import AuthenticatedUser
from shared.auth.verifier import TokenVerificationError
from shared.errors import PermissionDeniedError, UnauthorizedError

_bearer = HTTPBearer(auto_error=False)

Credentials = Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]


def _authenticate(token: str) -> AuthenticatedUser:
    auth = get_auth()
    try:
        claims = auth.verifier.verify(token)
    except TokenVerificationError as exc:
        raise UnauthorizedError(f'invalid token: {exc}') from exc
    role = auth.role_resolver.resolve(claims.user_id)
    return AuthenticatedUser(user_id=claims.user_id, email=claims.email, role=role)


def get_current_user(credentials: Credentials = None) -> AuthenticatedUser:
    if credentials is None:
        raise UnauthorizedError('missing bearer token')
    return _authenticate(credentials.credentials)


def get_optional_user(credentials: Credentials = None) -> AuthenticatedUser | None:
    if credentials is None:
        return None
    return _authenticate(credentials.credentials)


def require_role(*roles: str):  # noqa: ANN201 - FastAPI dependency factory
    def dependency(
        user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    ) -> AuthenticatedUser:
        if user.role not in roles:
            raise PermissionDeniedError(f'requires role: {", ".join(roles)}')
        return user

    return dependency
