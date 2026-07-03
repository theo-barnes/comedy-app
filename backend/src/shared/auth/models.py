from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AuthenticatedUser:
    """A verified request principal.

    ``role`` is the application role from ``public.profiles`` (fan, comedian,
    venue) — not the Postgres role claim inside the Supabase JWT. It is
    ``None`` when the user has not selected a role yet.
    """

    user_id: str
    email: str | None
    role: str | None
