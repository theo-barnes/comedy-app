from __future__ import annotations

from datetime import date, datetime
from typing import Protocol, Sequence

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, sessionmaker

from content.models.orm import ContentRow
from engagement.models.orm import EngagementEventRow
from location.models.orm import Place
from social.models.orm import FollowRow

from .models.domain import AudiencePlace, ContentStatsDaily, CreatorStatsDaily, EventRecord
from .models.orm import ContentStatsDailyRow, CreatorStatsDailyRow


class AnalyticsRepository(Protocol):
    # rollup inputs
    def events_between(self, start: datetime, end: datetime) -> list[EventRecord]: ...

    def content_creators(self, content_ids: Sequence[str]) -> dict[str, str]: ...

    def follows_created_between(self, start: datetime, end: datetime) -> list[str]: ...

    # rollup outputs
    def upsert_content_stats(self, stats: Sequence[ContentStatsDaily]) -> None: ...

    def upsert_creator_stats(self, stats: Sequence[CreatorStatsDaily]) -> None: ...

    # reads
    def creator_content_ids(self, creator_id: str) -> list[str]: ...

    def content_stats_range(
        self, content_ids: Sequence[str], start: date, end: date
    ) -> list[ContentStatsDaily]: ...

    def creator_stats_range(
        self, creator_id: str, start: date, end: date
    ) -> list[CreatorStatsDaily]: ...

    def top_places_for_creator(
        self, creator_id: str, *, since: datetime, limit: int
    ) -> list[AudiencePlace]: ...


class SqlAnalyticsRepository:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def events_between(self, start: datetime, end: datetime) -> list[EventRecord]:
        stmt = select(EngagementEventRow).where(
            EngagementEventRow.occurred_at >= start, EngagementEventRow.occurred_at < end
        )
        with self._session_factory() as session:
            rows = session.execute(stmt).scalars().all()
            return [
                EventRecord(
                    event_type=r.event_type,
                    occurred_at=r.occurred_at,
                    content_id=r.content_id,
                    user_id=r.user_id,
                    metadata=r.metadata_,
                )
                for r in rows
            ]

    def content_creators(self, content_ids: Sequence[str]) -> dict[str, str]:
        if not content_ids:
            return {}
        with self._session_factory() as session:
            rows = session.execute(
                select(ContentRow.id, ContentRow.creator_id).where(
                    ContentRow.id.in_(content_ids)
                )
            ).all()
            return {content_id: creator_id for content_id, creator_id in rows}

    def follows_created_between(self, start: datetime, end: datetime) -> list[str]:
        with self._session_factory() as session:
            rows = session.execute(
                select(FollowRow.creator_id).where(
                    FollowRow.created_at >= start, FollowRow.created_at < end
                )
            ).scalars()
            return list(rows)

    def upsert_content_stats(self, stats: Sequence[ContentStatsDaily]) -> None:
        if not stats:
            return
        values = [
            {
                'content_id': s.content_id,
                'date': s.date,
                'views': s.views,
                'completions': s.completions,
                'shares': s.shares,
                'ticket_clicks': s.ticket_clicks,
                'watch_seconds': s.watch_seconds,
            }
            for s in stats
        ]
        stmt = pg_insert(ContentStatsDailyRow).values(values)
        stmt = stmt.on_conflict_do_update(
            index_elements=['content_id', 'date'],
            set_={
                'views': stmt.excluded.views,
                'completions': stmt.excluded.completions,
                'shares': stmt.excluded.shares,
                'ticket_clicks': stmt.excluded.ticket_clicks,
                'watch_seconds': stmt.excluded.watch_seconds,
                'updated_at': func.now(),
            },
        )
        with self._session_factory() as session:
            session.execute(stmt)
            session.commit()

    def upsert_creator_stats(self, stats: Sequence[CreatorStatsDaily]) -> None:
        if not stats:
            return
        values = [
            {
                'creator_id': s.creator_id,
                'date': s.date,
                'followers_gained': s.followers_gained,
                'profile_views': s.profile_views,
                'total_views': s.total_views,
            }
            for s in stats
        ]
        stmt = pg_insert(CreatorStatsDailyRow).values(values)
        stmt = stmt.on_conflict_do_update(
            index_elements=['creator_id', 'date'],
            set_={
                'followers_gained': stmt.excluded.followers_gained,
                'profile_views': stmt.excluded.profile_views,
                'total_views': stmt.excluded.total_views,
                'updated_at': func.now(),
            },
        )
        with self._session_factory() as session:
            session.execute(stmt)
            session.commit()

    def creator_content_ids(self, creator_id: str) -> list[str]:
        with self._session_factory() as session:
            rows = session.execute(
                select(ContentRow.id).where(
                    ContentRow.creator_id == creator_id, ContentRow.status != 'removed'
                )
            ).scalars()
            return list(rows)

    def content_stats_range(
        self, content_ids: Sequence[str], start: date, end: date
    ) -> list[ContentStatsDaily]:
        if not content_ids:
            return []
        stmt = select(ContentStatsDailyRow).where(
            ContentStatsDailyRow.content_id.in_(content_ids),
            ContentStatsDailyRow.date >= start,
            ContentStatsDailyRow.date <= end,
        )
        with self._session_factory() as session:
            rows = session.execute(stmt).scalars().all()
            return [
                ContentStatsDaily(
                    content_id=r.content_id,
                    date=r.date,
                    views=r.views,
                    completions=r.completions,
                    shares=r.shares,
                    ticket_clicks=r.ticket_clicks,
                    watch_seconds=r.watch_seconds,
                )
                for r in rows
            ]

    def creator_stats_range(
        self, creator_id: str, start: date, end: date
    ) -> list[CreatorStatsDaily]:
        stmt = select(CreatorStatsDailyRow).where(
            CreatorStatsDailyRow.creator_id == creator_id,
            CreatorStatsDailyRow.date >= start,
            CreatorStatsDailyRow.date <= end,
        )
        with self._session_factory() as session:
            rows = session.execute(stmt).scalars().all()
            return [
                CreatorStatsDaily(
                    creator_id=r.creator_id,
                    date=r.date,
                    followers_gained=r.followers_gained,
                    profile_views=r.profile_views,
                    total_views=r.total_views,
                )
                for r in rows
            ]

    def top_places_for_creator(
        self, creator_id: str, *, since: datetime, limit: int
    ) -> list[AudiencePlace]:
        stmt = (
            select(ContentRow.place_id, Place.name, func.count())
            .join(
                EngagementEventRow, EngagementEventRow.content_id == ContentRow.id
            )
            .outerjoin(Place, Place.id == ContentRow.place_id)
            .where(
                ContentRow.creator_id == creator_id,
                ContentRow.place_id.is_not(None),
                EngagementEventRow.occurred_at >= since,
                EngagementEventRow.event_type == 'video_viewed',
            )
            .group_by(ContentRow.place_id, Place.name)
            .order_by(func.count().desc())
            .limit(limit)
        )
        with self._session_factory() as session:
            rows = session.execute(stmt).all()
            return [
                AudiencePlace(place_id=place_id, name=name, views=views)
                for place_id, name, views in rows
            ]
