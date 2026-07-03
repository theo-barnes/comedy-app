from __future__ import annotations

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base

EVENT_STATUSES = ('scheduled', 'cancelled')


class EventRow(Base):
    __tablename__ = 'events'

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    venue_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey('venue_profiles.user_id', ondelete='CASCADE'),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    place_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey('places.id', ondelete='SET NULL')
    )
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    h3_index: Mapped[str | None] = mapped_column(String(20))
    center = mapped_column(Geometry('POINT', srid=4326), nullable=True)
    ticket_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="'scheduled'")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint(f"status in {EVENT_STATUSES!r}", name='events_status_check'),
        CheckConstraint('end_time is null or end_time > start_time',
                        name='events_time_order_check'),
        Index('events_venue_start_idx', 'venue_id', 'start_time'),
        Index('events_start_idx', 'start_time'),
        Index('events_h3_idx', 'h3_index'),
        Index('events_place_idx', 'place_id'),
        Index('events_center_gix', 'center', postgresql_using='gist'),
    )


class EventComedianRow(Base):
    __tablename__ = 'event_comedians'

    event_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey('events.id', ondelete='CASCADE'), primary_key=True
    )
    comedian_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False),
        ForeignKey('comedian_profiles.user_id', ondelete='CASCADE'),
        primary_key=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index('event_comedians_comedian_idx', 'comedian_id'),)
