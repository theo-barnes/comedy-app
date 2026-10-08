"""Durable intent keys are recorded before any Storage mutation."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from shared.database import Base


class ImageAssetRow(Base):
    __tablename__ = 'image_assets'

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True)
    owner_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False)
    # Retain cleanup work even if the event or venue is physically deleted.
    event_id: Mapped[str] = mapped_column(UUID(as_uuid=False), nullable=False)
    purpose: Mapped[str] = mapped_column(String(30), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    content_type: Mapped[str] = mapped_column(String(30), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    upload_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    original_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    prepared_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    display_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    output_type: Mapped[str | None] = mapped_column(String(30))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    touched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        CheckConstraint("purpose = 'gig-poster'", name='image_assets_purpose_check'),
        CheckConstraint(
            "status IN ('uploading', 'ready', 'attached', 'retired', 'failed', 'deleted')",
            name='image_assets_status_check',
        ),
        Index('image_assets_cleanup_idx', 'status', 'touched_at'),
        Index('image_assets_event_idx', 'event_id'),
    )
