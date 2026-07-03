from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone

from analytics.models.domain import EventRecord
from analytics.repository import AnalyticsRepository
from shared.cache import CacheBackend

TRENDING_CACHE_KEY = 'feed:trending'
TRENDING_HALF_LIFE_HOURS = 24.0

_EVENT_WEIGHT = {
    'video_viewed': 1.0,
    'video_completed': 3.0,
    'video_shared': 5.0,
    'ticket_clicked': 4.0,
}


def compute_trending_scores(
    events: list[EventRecord], *, now: datetime
) -> list[tuple[str, float]]:
    scores: dict[str, float] = {}
    for event in events:
        if event.content_id is None:
            continue
        weight = _EVENT_WEIGHT.get(event.event_type)
        if weight is None:
            continue
        age_hours = max((now - event.occurred_at).total_seconds() / 3600, 0.0)
        decay = math.exp(-math.log(2) * age_hours / TRENDING_HALF_LIFE_HOURS)
        scores[event.content_id] = scores.get(event.content_id, 0.0) + weight * decay
    return sorted(scores.items(), key=lambda pair: (-pair[1], pair[0]))


def run_trending(
    repository: AnalyticsRepository,
    cache: CacheBackend,
    *,
    now: datetime | None = None,
    window_days: int = 7,
    limit: int = 100,
    ttl_seconds: int = 600,
) -> int:
    now = now or datetime.now(timezone.utc)
    events = repository.events_between(now - timedelta(days=window_days), now)
    top = compute_trending_scores(events, now=now)[:limit]
    cache.set(TRENDING_CACHE_KEY, json.dumps(top), ttl_seconds=ttl_seconds)
    return len(top)
