from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from analytics.models.domain import ContentStatsDaily, CreatorStatsDaily, EventRecord
from analytics.repository import AnalyticsRepository

_EVENT_FIELD = {
    'video_viewed': 'views',
    'video_completed': 'completions',
    'video_shared': 'shares',
    'ticket_clicked': 'ticket_clicks',
}


def compute_content_stats(events: list[EventRecord]) -> list[ContentStatsDaily]:
    buckets: dict[tuple[str, object], dict[str, float]] = defaultdict(
        lambda: {'views': 0, 'completions': 0, 'shares': 0, 'ticket_clicks': 0, 'watch_seconds': 0.0}
    )
    for event in events:
        if event.content_id is None:
            continue
        field = _EVENT_FIELD.get(event.event_type)
        if field is None:
            continue
        key = (event.content_id, event.occurred_at.date())
        buckets[key][field] += 1
        if event.event_type == 'video_viewed' and event.metadata:
            seconds = event.metadata.get('watchSeconds')
            if isinstance(seconds, (int, float)) and seconds > 0:
                buckets[key]['watch_seconds'] += float(seconds)
    return [
        ContentStatsDaily(
            content_id=content_id,
            date=day,  # type: ignore[arg-type]
            views=int(values['views']),
            completions=int(values['completions']),
            shares=int(values['shares']),
            ticket_clicks=int(values['ticket_clicks']),
            watch_seconds=values['watch_seconds'],
        )
        for (content_id, day), values in buckets.items()
    ]


def compute_creator_stats(
    events: list[EventRecord],
    content_creators: dict[str, str],
    follow_creator_ids: list[str],
    *,
    day_of_follows: object,
) -> list[CreatorStatsDaily]:
    buckets: dict[tuple[str, object], dict[str, int]] = defaultdict(
        lambda: {'followers_gained': 0, 'profile_views': 0, 'total_views': 0}
    )
    for event in events:
        day = event.occurred_at.date()
        if event.event_type == 'profile_viewed':
            creator_id = (event.metadata or {}).get('creatorId')
            if isinstance(creator_id, str) and creator_id:
                buckets[(creator_id, day)]['profile_views'] += 1
        elif event.event_type == 'video_viewed' and event.content_id is not None:
            creator_id = content_creators.get(event.content_id)
            if creator_id is not None:
                buckets[(creator_id, day)]['total_views'] += 1
    for creator_id in follow_creator_ids:
        buckets[(creator_id, day_of_follows)]['followers_gained'] += 1
    return [
        CreatorStatsDaily(
            creator_id=creator_id,
            date=day,  # type: ignore[arg-type]
            followers_gained=values['followers_gained'],
            profile_views=values['profile_views'],
            total_views=values['total_views'],
        )
        for (creator_id, day), values in buckets.items()
    ]


def run_rollup(
    repository: AnalyticsRepository,
    *,
    now: datetime | None = None,
    window_days: int = 2,
) -> tuple[int, int]:
    """Recompute the last ``window_days`` of daily stats. Idempotent upsert.

    Returns (content_rows, creator_rows) written.
    """
    now = now or datetime.now(timezone.utc)
    written_content = 0
    written_creator = 0
    for offset in range(window_days):
        day = (now - timedelta(days=offset)).date()
        start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
        end = start + timedelta(days=1)
        events = repository.events_between(start, end)
        content_stats = compute_content_stats(events)
        creators = repository.content_creators(
            [s.content_id for s in content_stats]
        )
        creator_stats = compute_creator_stats(
            events,
            creators,
            repository.follows_created_between(start, end),
            day_of_follows=day,
        )
        repository.upsert_content_stats(content_stats)
        repository.upsert_creator_stats(creator_stats)
        written_content += len(content_stats)
        written_creator += len(creator_stats)
    return written_content, written_creator
