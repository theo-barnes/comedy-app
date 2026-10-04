"""Domain model for an account's intentionally limited public identity."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class PublicProfile:
    """Public account identity, without private profile fields."""

    user_id: str
    display_name: str