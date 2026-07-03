from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base

REPORT_TARGET_TYPES = ('content', 'creator')
REPORT_STATUSES = ('open', 'reviewed', 'actioned', 'dismissed')


class FollowRow(Base):
    __tablename__ = 'follows'

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    follower_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False)
    creator_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint('follower_id', 'creator_id', name='follows_pair_uq'),
        CheckConstraint('follower_id <> creator_id', name='follows_no_self_check'),
        Index('follows_creator_idx', 'creator_id'),
        Index('follows_follower_created_idx', 'follower_id', 'created_at'),
    )


class ContentReportRow(Base):
    __tablename__ = 'content_reports'

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    reporter_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False)
    target_type: Mapped[str] = mapped_column(String(20), nullable=False)
    target_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    details: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="'open'")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            f"target_type in {REPORT_TARGET_TYPES!r}", name='content_reports_target_type_check'
        ),
        CheckConstraint(f"status in {REPORT_STATUSES!r}", name='content_reports_status_check'),
        Index('content_reports_status_created_idx', 'status', 'created_at'),
    )


class UserBlockRow(Base):
    __tablename__ = 'user_blocks'

    blocker_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    blocked_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint('blocker_id <> blocked_id', name='user_blocks_no_self_check'),
    )
