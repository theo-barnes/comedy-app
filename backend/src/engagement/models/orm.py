from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Identity, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base

ENGAGEMENT_EVENT_TYPES = (
    'video_viewed',
    'video_completed',
    'video_shared',
    'profile_viewed',
    'ticket_clicked',
)


class SaveRow(Base):
    __tablename__ = 'saves'

    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    content_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey('content.id', ondelete='CASCADE'), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('saves_user_created_idx', 'user_id', 'created_at'),
        Index('saves_content_idx', 'content_id'),
    )


class LikeRow(Base):
    __tablename__ = 'likes'

    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    content_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey('content.id', ondelete='CASCADE'), primary_key=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index('likes_content_idx', 'content_id'),)


class EngagementEventRow(Base):
    __tablename__ = 'engagement_events'

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    user_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    content_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    metadata_: Mapped[dict[str, Any] | None] = mapped_column('metadata', JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            f"event_type in {ENGAGEMENT_EVENT_TYPES!r}", name='engagement_event_type_check'
        ),
        Index('engagement_events_content_occurred_idx', 'content_id', 'occurred_at'),
        Index('engagement_events_occurred_idx', 'occurred_at'),
    )
