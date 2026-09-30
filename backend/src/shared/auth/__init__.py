"""Public auth surface: authenticated-user model, token verification, FastAPI dependencies."""

from .dependencies import get_current_user, get_optional_user, require_role
from .models import AuthenticatedUser
from .verifier import TokenClaims, TokenVerificationError, TokenVerifier

__all__ = [
    'AuthenticatedUser',
    'TokenClaims',
    'TokenVerificationError',
    'TokenVerifier',
    'get_current_user',
    'get_optional_user',
    'require_role',
]
