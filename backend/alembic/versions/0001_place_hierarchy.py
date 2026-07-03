"""create place hierarchy discovery schema

Revision ID: 0001_place_hierarchy
Revises:
Create Date: 2026-07-01
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry

revision: str = '0001_place_hierarchy'
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PLACE_TYPES = ('country', 'region', 'metro', 'city', 'borough', 'neighbourhood')


def upgrade() -> None:
    op.execute('create extension if not exists postgis')

    op.create_table(
        'places',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=False), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('country_code', sa.String(length=2), nullable=True),
        sa.Column('parent_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('places.id', ondelete='SET NULL'), nullable=True),
        sa.Column('population', sa.BigInteger(), nullable=True),
        sa.Column('market_size', sa.String(length=10), nullable=True),
        sa.Column('h3_index', sa.String(length=20), nullable=True),
        sa.Column('boundary', Geometry('MULTIPOLYGON', srid=4326), nullable=True),
        sa.Column('center', Geometry('POINT', srid=4326), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.CheckConstraint(f"type in {PLACE_TYPES!r}", name='places_type_check'),
        sa.UniqueConstraint('type', 'country_code', 'name', 'parent_id', name='places_identity_uq'),
    )
    op.create_index('places_boundary_gix', 'places', ['boundary'], postgresql_using='gist')
    op.create_index('places_center_gix', 'places', ['center'], postgresql_using='gist')
    op.create_index('places_h3_idx', 'places', ['h3_index'])
    op.create_index('places_type_idx', 'places', ['type'])
    op.create_index('places_parent_idx', 'places', ['parent_id'])

    op.create_table(
        'place_hierarchy',
        sa.Column('ancestor_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('places.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('descendant_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('places.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('depth', sa.Integer(), nullable=False),
    )
    op.create_index('place_hierarchy_ancestor_depth_idx', 'place_hierarchy', ['ancestor_id', 'depth'])
    op.create_index('place_hierarchy_descendant_idx', 'place_hierarchy', ['descendant_id'])

    op.create_table(
        'discovery_cache',
        sa.Column('cache_key', sa.Text(), primary_key=True),
        sa.Column('scope_type', sa.String(length=40), nullable=False),
        sa.Column('payload', sa.dialects.postgresql.JSONB(), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('discovery_cache_expires_idx', 'discovery_cache', ['expires_at'])


def downgrade() -> None:
    op.drop_index('discovery_cache_expires_idx', table_name='discovery_cache')
    op.drop_table('discovery_cache')

    op.drop_index('place_hierarchy_descendant_idx', table_name='place_hierarchy')
    op.drop_index('place_hierarchy_ancestor_depth_idx', table_name='place_hierarchy')
    op.drop_table('place_hierarchy')

    op.drop_index('places_parent_idx', table_name='places')
    op.drop_index('places_type_idx', table_name='places')
    op.drop_index('places_h3_idx', table_name='places')
    op.drop_index('places_center_gix', table_name='places')
    op.drop_index('places_boundary_gix', table_name='places')
    op.drop_table('places')
