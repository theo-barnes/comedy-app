from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

CONTENT_TYPES = ('video_clip', 'image', 'event_promotion', 'announcement')
CONTENT_STATUSES = ('draft', 'processing', 'published', 'removed')
CONTENT_VISIBILITIES = ('public', 'unlisted')
MEDIA_STATUSES = ('pending', 'ready', 'errored')


class ContentRow(Base):
    __tablename__ = 'content'

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    creator_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    event_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False))
    place_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey('places.id', ondelete='SET NULL')
    )
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    h3_index: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="'draft'")
    visibility: Mapped[str] = mapped_column(String(20), nullable=False, server_default="'public'")
    image_url: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    media: Mapped['MediaAssetRow | None'] = relationship(back_populates='content', uselist=False)

    __table_args__ = (
        CheckConstraint(f"type in {CONTENT_TYPES!r}", name='content_type_check'),
        CheckConstraint(f"status in {CONTENT_STATUSES!r}", name='content_status_check'),
        CheckConstraint(
            f"visibility in {CONTENT_VISIBILITIES!r}", name='content_visibility_check'
        ),
        Index('content_creator_created_idx', 'creator_id', 'created_at'),
        Index('content_status_published_idx', 'status', 'published_at'),
        Index('content_h3_idx', 'h3_index'),
        Index('content_place_idx', 'place_id'),
        Index('content_event_idx', 'event_id'),
    )


class MediaAssetRow(Base):
    __tablename__ = 'media_assets'

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid()
    )
    content_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey('content.id', ondelete='CASCADE'), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(40), nullable=False)
    provider_uid: Mapped[str] = mapped_column(Text, nullable=False)
    playback_hls_url: Mapped[str | None] = mapped_column(Text)
    thumbnail_url: Mapped[str | None] = mapped_column(Text)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="'pending'")
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    content: Mapped[ContentRow] = relationship(back_populates='media')

    __table_args__ = (
        CheckConstraint(f"status in {MEDIA_STATUSES!r}", name='media_assets_status_check'),
        UniqueConstraint('content_id', name='media_assets_content_uq'),
        UniqueConstraint('provider', 'provider_uid', name='media_assets_provider_uid_uq'),
    )
