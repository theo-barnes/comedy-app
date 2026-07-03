from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base


class ComedianProfileRow(Base):
    __tablename__ = 'comedian_profiles'

    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    stage_name: Mapped[str] = mapped_column(Text, nullable=False)
    bio: Mapped[str | None] = mapped_column(Text)
    genres: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, server_default='{}')
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='true')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class VenueProfileRow(Base):
    __tablename__ = 'venue_profiles'

    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    venue_name: Mapped[str] = mapped_column(Text, nullable=False)
    bio: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    capacity: Mapped[int | None] = mapped_column(Integer)
    place_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey('places.id', ondelete='SET NULL')
    )
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default='true')
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index('venue_profiles_place_idx', 'place_id'),)
