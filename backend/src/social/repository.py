from __future__ import annotations

from datetime import datetime
from typing import Protocol

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, sessionmaker

from .models.domain import Follow, Report, ReportTargetType
from .models.orm import ContentReportRow, FollowRow, UserBlockRow


class SocialRepository(Protocol):
    def add_follow(self, follower_id: str, creator_id: str) -> bool: ...

    def remove_follow(self, follower_id: str, creator_id: str) -> bool: ...

    def list_following(
        self, follower_id: str, *, limit: int, before: datetime | None
    ) -> list[Follow]: ...

    def count_followers(self, creator_id: str) -> int: ...

    def add_block(self, blocker_id: str, blocked_id: str) -> bool: ...

    def remove_block(self, blocker_id: str, blocked_id: str) -> bool: ...

    def list_blocked_ids(self, blocker_id: str) -> list[str]: ...

    def create_report(
        self,
        reporter_id: str,
        target_type: ReportTargetType,
        target_id: str,
        reason: str,
        details: str | None,
    ) -> Report: ...


class SqlSocialRepository:
    def __init__(self, session_factory: sessionmaker[Session]) -> None:
        self._session_factory = session_factory

    def add_follow(self, follower_id: str, creator_id: str) -> bool:
        stmt = (
            pg_insert(FollowRow)
            .values(follower_id=follower_id, creator_id=creator_id)
            .on_conflict_do_nothing(constraint='follows_pair_uq')
        )
        with self._session_factory() as session:
            result = session.execute(stmt)
            session.commit()
            return bool(result.rowcount)

    def remove_follow(self, follower_id: str, creator_id: str) -> bool:
        stmt = delete(FollowRow).where(
            FollowRow.follower_id == follower_id, FollowRow.creator_id == creator_id
        )
        with self._session_factory() as session:
            result = session.execute(stmt)
            session.commit()
            return bool(result.rowcount)

    def list_following(
        self, follower_id: str, *, limit: int, before: datetime | None
    ) -> list[Follow]:
        stmt = (
            select(FollowRow)
            .where(FollowRow.follower_id == follower_id)
            .order_by(FollowRow.created_at.desc())
            .limit(limit)
        )
        if before is not None:
            stmt = stmt.where(FollowRow.created_at < before)
        with self._session_factory() as session:
            rows = session.execute(stmt).scalars().all()
            return [
                Follow(
                    follower_id=row.follower_id,
                    creator_id=row.creator_id,
                    created_at=row.created_at,
                )
                for row in rows
            ]

    def count_followers(self, creator_id: str) -> int:
        from sqlalchemy import func as sa_func

        stmt = select(sa_func.count()).where(FollowRow.creator_id == creator_id)
        with self._session_factory() as session:
            return int(session.execute(stmt).scalar_one())

    def add_block(self, blocker_id: str, blocked_id: str) -> bool:
        stmt = (
            pg_insert(UserBlockRow)
            .values(blocker_id=blocker_id, blocked_id=blocked_id)
            .on_conflict_do_nothing()
        )
        with self._session_factory() as session:
            result = session.execute(stmt)
            session.commit()
            return bool(result.rowcount)

    def remove_block(self, blocker_id: str, blocked_id: str) -> bool:
        stmt = delete(UserBlockRow).where(
            UserBlockRow.blocker_id == blocker_id, UserBlockRow.blocked_id == blocked_id
        )
        with self._session_factory() as session:
            result = session.execute(stmt)
            session.commit()
            return bool(result.rowcount)

    def list_blocked_ids(self, blocker_id: str) -> list[str]:
        stmt = select(UserBlockRow.blocked_id).where(UserBlockRow.blocker_id == blocker_id)
        with self._session_factory() as session:
            return list(session.execute(stmt).scalars().all())

    def create_report(
        self,
        reporter_id: str,
        target_type: ReportTargetType,
        target_id: str,
        reason: str,
        details: str | None,
    ) -> Report:
        row = ContentReportRow(
            reporter_id=reporter_id,
            target_type=target_type.value,
            target_id=target_id,
            reason=reason,
            details=details,
        )
        with self._session_factory() as session:
            session.add(row)
            session.commit()
            session.refresh(row)
            return Report(
                id=row.id,
                reporter_id=row.reporter_id,
                target_type=ReportTargetType(row.target_type),
                target_id=row.target_id,
                reason=row.reason,
                details=row.details,
                status=row.status,
                created_at=row.created_at,
            )
