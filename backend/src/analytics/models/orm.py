from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, Index, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base


class ContentStatsDailyRow(Base):
    __tablename__ = 'content_stats_daily'

    content_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    views: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')
    completions: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')
    shares: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')
    ticket_clicks: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')
    watch_seconds: Mapped[float] = mapped_column(Float, nullable=False, server_default='0')
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index('content_stats_daily_date_idx', 'date'),)


class CreatorStatsDailyRow(Base):
    __tablename__ = 'creator_stats_daily'

    creator_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    date: Mapped[date] = mapped_column(Date, primary_key=True)
    followers_gained: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')
    profile_views: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')
    total_views: Mapped[int] = mapped_column(Integer, nullable=False, server_default='0')
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index('creator_stats_daily_date_idx', 'date'),)
