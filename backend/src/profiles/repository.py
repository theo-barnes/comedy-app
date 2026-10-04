"""Read-only access to the allowlisted public account profile fields."""

from __future__ import annotations

from typing import Protocol

from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker

from .models.domain import PublicProfile

_DEFAULT_DISPLAY_NAME = 'Creator'


class PublicProfileRepository(Protocol):
    """Reads the intentionally limited public identity for an account."""

    def get_public_profile(self, user_id: str) -> PublicProfile | None: ...


def _public_profile_from_row(row: tuple[str, str | None] | None) -> PublicProfile | None:
    if row is None:
        return None
    user_id, display_name = row
    name = display_name.strip() if display_name and display_name.strip() else _DEFAULT_DISPLAY_NAME
    return PublicProfile(user_id=str(user_id), display_name=name)


class SqlPublicProfileRepository:
    """Reads allowlisted fields from the Supabase-owned profiles table."""

    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def get_public_profile(self, user_id: str) -> PublicProfile | None:
        with self._session_factory() as session:
            row = session.execute(
                text('SELECT id::text, display_name FROM public.profiles WHERE id = CAST(:user_id AS uuid)'),
                {'user_id': user_id},
            ).first()
        return _public_profile_from_row(row)