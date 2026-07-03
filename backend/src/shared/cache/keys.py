from __future__ import annotations

import h3


def make_discovery_cache_key(latitude: float, longitude: float, resolution: int) -> str:
    """Generate a stable cache key by snapping coordinates to an H3 cell.

    Using the H3 index (rather than raw coordinates) collapses nearby
    requests onto a shared key, dramatically improving cache hit rates.
    """

    cell = h3.latlng_to_cell(latitude, longitude, resolution)
    return f'discovery:{resolution}:{cell}'
