from __future__ import annotations

from datetime import datetime
from typing import Protocol, Sequence

from sqlalchemy import func, select
from sqlalchemy.orm import Session, sessionmaker

from content.models.orm import ContentRow, MediaAssetRow
from creators.models.orm import ComedianProfileRow, VenueProfileRow
from engagement.models.orm import EngagementEventRow, LikeRow, SaveRow
from events.models.orm import EventRow
from social.models.orm import FollowRow, UserBlockRow

from .models.domain import ComedianSummary, FeedCandidate, FeedItem, LinkedEvent


class FeedRepository(Protocol):
    def candidates_by_creators(
        self, creator_ids: Sequence[str], *, limit: int
    ) -> list[FeedCandidate]: ...

    def candidates_nearby(
        self, h3_cells: Sequence[str], place_id: str | None, *, limit: int
    ) -> list[FeedCandidate]: ...

    def candidates_trending(self, *, since: datetime, limit: int) -> list[FeedCandidate]: ...

    def followed_creator_ids(self, user_id: str) -> tuple[str, ...]: ...

    def blocked_user_ids(self, user_id: str) -> tuple[str, ...]: ...

    def hydrate(self, content_ids: Sequence[str], viewer_id: str) -> list[FeedItem]: ...

    def recent_comedians(self, *, limit: int) -> list[ComedianSummary]: ...


_PUBLISHED = (ContentRow.status == 'published', ContentRow.visibility == 'public')


class SqlFeedRepository:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def candidates_by_creators(
        self, creator_ids: Sequence[str], *, limit: int
    ) -> list[FeedCandidate]:
        if not creator_ids:
            return []
        stmt = (
            select(ContentRow)
            .where(*_PUBLISHED, ContentRow.creator_id.in_(creator_ids))
            .order_by(ContentRow.published_at.desc())
            .limit(limit)
        )
        return self._load_candidates(stmt)

    def candidates_nearby(
        self, h3_cells: Sequence[str], place_id: str | None, *, limit: int
    ) -> list[FeedCandidate]:
        conditions = []
        if h3_cells:
            conditions.append(ContentRow.h3_index.in_(h3_cells))
        if place_id is not None:
            conditions.append(ContentRow.place_id == place_id)
        if not conditions:
            return []
        from sqlalchemy import or_

        stmt = (
            select(ContentRow)
            .where(*_PUBLISHED, or_(*conditions))
            .order_by(ContentRow.published_at.desc())
            .limit(limit)
        )
        return self._load_candidates(stmt)

    def candidates_trending(self, *, since: datetime, limit: int) -> list[FeedCandidate]:
        trending_ids = (
            select(EngagementEventRow.content_id)
            .where(
                EngagementEventRow.occurred_at >= since,
                EngagementEventRow.content_id.is_not(None),
            )
            .group_by(EngagementEventRow.content_id)
            .order_by(func.count().desc())
            .limit(limit)
            .scalar_subquery()
        )
        stmt = select(ContentRow).where(*_PUBLISHED, ContentRow.id.in_(trending_ids))
        return self._load_candidates(stmt)

    def followed_creator_ids(self, user_id: str) -> tuple[str, ...]:
        with self._session_factory() as session:
            rows = session.execute(
                select(FollowRow.creator_id).where(FollowRow.follower_id == user_id)
            ).scalars()
            return tuple(rows)

    def blocked_user_ids(self, user_id: str) -> tuple[str, ...]:
        with self._session_factory() as session:
            rows = session.execute(
                select(UserBlockRow.blocked_id).where(UserBlockRow.blocker_id == user_id)
            ).scalars()
            return tuple(rows)

    def hydrate(self, content_ids: Sequence[str], viewer_id: str) -> list[FeedItem]:
        if not content_ids:
            return []
        with self._session_factory() as session:
            rows = session.execute(
                select(ContentRow, MediaAssetRow, ComedianProfileRow, VenueProfileRow)
                .outerjoin(
                    MediaAssetRow,
                    (MediaAssetRow.content_id == ContentRow.id)
                    & MediaAssetRow.is_current.is_(True)
                    & (MediaAssetRow.status == 'ready'),
                )
                .outerjoin(
                    ComedianProfileRow, ComedianProfileRow.user_id == ContentRow.creator_id
                )
                .outerjoin(VenueProfileRow, VenueProfileRow.user_id == ContentRow.creator_id)
                .where(ContentRow.id.in_(content_ids))
            ).all()
            like_counts = self._pair_counts(session, LikeRow, content_ids)
            save_counts = self._pair_counts(session, SaveRow, content_ids)
            viewer_likes = self._viewer_pairs(session, LikeRow, viewer_id, content_ids)
            viewer_saves = self._viewer_pairs(session, SaveRow, viewer_id, content_ids)

            event_ids = {c.event_id for c, *_ in rows if c.event_id is not None}
            events: dict[str, EventRow] = {}
            if event_ids:
                for event in session.execute(
                    select(EventRow).where(EventRow.id.in_(event_ids))
                ).scalars():
                    events[event.id] = event

            by_id: dict[str, FeedItem] = {}
            for content, media, comedian, venue in rows:
                name = (
                    comedian.stage_name
                    if comedian is not None
                    else venue.venue_name if venue is not None else 'Unknown'
                )
                linked: LinkedEvent | None = None
                event = events.get(content.event_id) if content.event_id else None
                if event is not None:
                    linked = LinkedEvent(
                        id=event.id,
                        title=event.title,
                        start_time=event.start_time,
                        venue_id=event.venue_id,
                        ticket_url=event.ticket_url,
                    )
                by_id[content.id] = FeedItem(
                    content_id=content.id,
                    content_type=content.type,
                    title=content.title,
                    creator_id=content.creator_id,
                    creator_name=name,
                    published_at=content.published_at or content.created_at,
                    description=content.description,
                    hls_url=media.playback_hls_url if media is not None else None,
                    thumbnail_url=media.thumbnail_url if media is not None else None,
                    image_url=content.image_url,
                    linked_event=linked,
                    like_count=like_counts.get(content.id, 0),
                    save_count=save_counts.get(content.id, 0),
                    viewer_liked=content.id in viewer_likes,
                    viewer_saved=content.id in viewer_saves,
                )
            # preserve requested order
            return [by_id[cid] for cid in content_ids if cid in by_id]

    def recent_comedians(self, *, limit: int) -> list[ComedianSummary]:
        stmt = (
            select(ComedianProfileRow)
            .order_by(ComedianProfileRow.created_at.desc())
            .limit(limit)
        )
        with self._session_factory() as session:
            rows = session.execute(stmt).scalars().all()
            return [
                ComedianSummary(user_id=r.user_id, stage_name=r.stage_name, bio=r.bio)
                for r in rows
            ]

    def venue_names(self, venue_ids: Sequence[str]) -> dict[str, str]:
        if not venue_ids:
            return {}
        with self._session_factory() as session:
            rows = session.execute(
                select(VenueProfileRow.user_id, VenueProfileRow.venue_name).where(
                    VenueProfileRow.user_id.in_(venue_ids)
                )
            ).all()
            return {user_id: name for user_id, name in rows}

    def _load_candidates(self, stmt) -> list[FeedCandidate]:  # noqa: ANN001
        with self._session_factory() as session:
            contents = session.execute(stmt).scalars().all()
            ids = [c.id for c in contents]
            like_counts = self._pair_counts(session, LikeRow, ids)
            save_counts = self._pair_counts(session, SaveRow, ids)
            event_counts = self._event_counts(session, ids)
            return [
                FeedCandidate(
                    content_id=c.id,
                    creator_id=c.creator_id,
                    content_type=c.type,
                    title=c.title,
                    published_at=c.published_at or c.created_at,
                    h3_index=c.h3_index,
                    place_id=c.place_id,
                    event_id=c.event_id,
                    view_count=event_counts.get((c.id, 'video_viewed'), 0),
                    completion_count=event_counts.get((c.id, 'video_completed'), 0),
                    like_count=like_counts.get(c.id, 0),
                    save_count=save_counts.get(c.id, 0),
                    ticket_click_count=event_counts.get((c.id, 'ticket_clicked'), 0),
                )
                for c in contents
            ]

    @staticmethod
    def _pair_counts(session: Session, model, content_ids: Sequence[str]) -> dict[str, int]:  # noqa: ANN001
        if not content_ids:
            return {}
        rows = session.execute(
            select(model.content_id, func.count())
            .where(model.content_id.in_(content_ids))
            .group_by(model.content_id)
        ).all()
        return {content_id: count for content_id, count in rows}

    @staticmethod
    def _viewer_pairs(
        session: Session, model, viewer_id: str, content_ids: Sequence[str]  # noqa: ANN001
    ) -> set[str]:
        if not content_ids:
            return set()
        rows = session.execute(
            select(model.content_id).where(
                model.user_id == viewer_id, model.content_id.in_(content_ids)
            )
        ).scalars()
        return set(rows)

    @staticmethod
    def _event_counts(
        session: Session, content_ids: Sequence[str]
    ) -> dict[tuple[str, str], int]:
        if not content_ids:
            return {}
        rows = session.execute(
            select(
                EngagementEventRow.content_id, EngagementEventRow.event_type, func.count()
            )
            .where(EngagementEventRow.content_id.in_(content_ids))
            .group_by(EngagementEventRow.content_id, EngagementEventRow.event_type)
        ).all()
        return {(content_id, event_type): count for content_id, event_type, count in rows}
