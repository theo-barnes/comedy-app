"""Cross-module dependency `Protocol`s ("ports") shared by more than one service.

Each service module still owns any `*Lookup` protocol that only it depends on;
this module exists solely to avoid multiple modules independently redeclaring
an identical structural type.
"""

from __future__ import annotations

from typing import Any, Protocol


class PlaceLookup(Protocol):
    """Resolves coordinates to a place, without depending on the location module's repository."""

    def resolve_city(self, lat: float, lng: float) -> Any | None: ...
