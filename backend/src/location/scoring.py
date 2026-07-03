from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True, frozen=True)
class InventorySignal:
    """Aggregated inventory signal used to choose a discovery granularity."""

    total_listings: int
    region_count: int

    @property
    def average_per_region(self) -> float:
        if self.region_count <= 0:
            return 0.0
        return self.total_listings / self.region_count


def has_sufficient_inventory(signal: InventorySignal, minimum_total: int) -> bool:
    """Decide whether local (neighbourhood/borough) discovery is worthwhile.

    When inventory is thin, discovery should widen to nearby cities so users
    still see enough content; when inventory is rich, keep it hyper-local.
    """

    return signal.total_listings >= minimum_total
