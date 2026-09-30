"""The cache contract between workers/trending.py (writer) and TrendingSource (reader)."""

from __future__ import annotations

import json

from shared.cache import CacheBackend

TRENDING_CACHE_KEY = 'feed:trending'


def read_trending_ids(cache: CacheBackend) -> list[str] | None:
    """Return cached content_ids ranked by trending score (best first), or None if the
    cache is cold/missing/corrupt so the caller can fall back to an on-demand query.
    """

    raw = cache.get(TRENDING_CACHE_KEY)
    if raw is None:
        return None
    try:
        pairs = json.loads(raw)
    except json.JSONDecodeError:
        return None
    if not isinstance(pairs, list):
        return None
    ids: list[str] = []
    for pair in pairs:
        if not (isinstance(pair, list) and len(pair) == 2 and isinstance(pair[0], str)):
            return None
        ids.append(pair[0])
    return ids
