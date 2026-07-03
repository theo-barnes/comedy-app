from __future__ import annotations

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from shared.database import Base

PLACE_TYPES = ('country', 'region', 'metro', 'city', 'borough', 'neighbourhood')


class Place(Base):
    """A node in the geographic hierarchy backed by a PostGIS boundary."""

    __tablename__ = 'places'

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(Text, nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    country_code: Mapped[str | None] = mapped_column(String(2))
    parent_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey('places.id', ondelete='SET NULL')
    )
    population: Mapped[int | None] = mapped_column(BigInteger)
    market_size: Mapped[str | None] = mapped_column(String(10))
    h3_index: Mapped[str | None] = mapped_column(String(20))
    boundary = mapped_column(Geometry('MULTIPOLYGON', srid=4326), nullable=True)
    center = mapped_column(Geometry('POINT', srid=4326), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    parent: Mapped['Place | None'] = relationship(remote_side=[id])

    __table_args__ = (
        CheckConstraint(f"type in {PLACE_TYPES!r}", name='places_type_check'),
        UniqueConstraint('type', 'country_code', 'name', 'parent_id', name='places_identity_uq'),
        Index('places_boundary_gix', 'boundary', postgresql_using='gist'),
        Index('places_center_gix', 'center', postgresql_using='gist'),
        Index('places_h3_idx', 'h3_index'),
        Index('places_type_idx', 'type'),
        Index('places_parent_idx', 'parent_id'),
    )


class PlaceHierarchy(Base):
    """Closure table enabling O(1) ancestor/descendant lookups at any depth."""

    __tablename__ = 'place_hierarchy'

    ancestor_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey('places.id', ondelete='CASCADE'), primary_key=True
    )
    descendant_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey('places.id', ondelete='CASCADE'), primary_key=True
    )
    depth: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        Index('place_hierarchy_ancestor_depth_idx', 'ancestor_id', 'depth'),
        Index('place_hierarchy_descendant_idx', 'descendant_id'),
    )


class DiscoveryCache(Base):
    """Durable cache fallback that survives process restarts and Redis loss."""

    __tablename__ = 'discovery_cache'

    cache_key: Mapped[str] = mapped_column(Text, primary_key=True)
    scope_type: Mapped[str] = mapped_column(String(40), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index('discovery_cache_expires_idx', 'expires_at'),
    )
