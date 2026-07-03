from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from .models.domain import DiscoveryRegion


class InventoryProvider(Protocol):
    """Supplies available content/listing counts for a place.

    The content domain does not exist yet, so the default implementation
    returns zero. Once content tables land (PremiumBackend Phase 1), swap in a
    provider backed by the content repository without touching discovery logic.
    """

    def count_for_place(self, place_id: str) -> int: ...

    def counts_for_regions(self, regions: list[DiscoveryRegion]) -> dict[str, int]: ...


@dataclass(slots=True)
class StubInventoryProvider:
    """Returns a fixed count for every place until real inventory exists."""

    default_count: int = 0

    def count_for_place(self, place_id: str) -> int:
        return self.default_count

    def counts_for_regions(self, regions: list[DiscoveryRegion]) -> dict[str, int]:
        return {region.id: self.default_count for region in regions}
