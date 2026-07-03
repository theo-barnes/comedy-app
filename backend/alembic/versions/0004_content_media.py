"""create content and media asset tables

Revision ID: 0004_content_media
Revises: 0003_creators_social
Create Date: 2026-07-02
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0004_content_media'
down_revision: str | None = '0003_creators_social'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

CONTENT_TYPES = ('video_clip', 'image', 'event_promotion', 'announcement')
CONTENT_STATUSES = ('draft', 'processing', 'published', 'removed')
CONTENT_VISIBILITIES = ('public', 'unlisted')
MEDIA_STATUSES = ('pending', 'ready', 'errored')


def upgrade() -> None:
    op.create_table(
        'content',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=False), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('creator_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        # FK to events is added in the events migration (0005).
        sa.Column('event_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('place_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('places.id', ondelete='SET NULL'), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('h3_index', sa.String(length=20), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False,
                  server_default=sa.text("'draft'")),
        sa.Column('visibility', sa.String(length=20), nullable=False,
                  server_default=sa.text("'public'")),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.CheckConstraint(f"type in {CONTENT_TYPES!r}", name='content_type_check'),
        sa.CheckConstraint(f"status in {CONTENT_STATUSES!r}", name='content_status_check'),
        sa.CheckConstraint(f"visibility in {CONTENT_VISIBILITIES!r}",
                           name='content_visibility_check'),
    )
    op.create_index('content_creator_created_idx', 'content', ['creator_id', 'created_at'])
    op.create_index('content_status_published_idx', 'content', ['status', 'published_at'])
    op.create_index('content_h3_idx', 'content', ['h3_index'])
    op.create_index('content_place_idx', 'content', ['place_id'])
    op.create_index('content_event_idx', 'content', ['event_id'])

    op.create_table(
        'media_assets',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=False), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('content_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('content.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider', sa.String(length=40), nullable=False),
        sa.Column('provider_uid', sa.Text(), nullable=False),
        sa.Column('playback_hls_url', sa.Text(), nullable=True),
        sa.Column('thumbnail_url', sa.Text(), nullable=True),
        sa.Column('duration_seconds', sa.Float(), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False,
                  server_default=sa.text("'pending'")),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.CheckConstraint(f"status in {MEDIA_STATUSES!r}", name='media_assets_status_check'),
        sa.UniqueConstraint('content_id', name='media_assets_content_uq'),
        sa.UniqueConstraint('provider', 'provider_uid', name='media_assets_provider_uid_uq'),
    )

    for table in ('content', 'media_assets'):
        op.execute(f'alter table {table} enable row level security')


def downgrade() -> None:
    op.drop_table('media_assets')
    op.drop_index('content_event_idx', table_name='content')
    op.drop_index('content_place_idx', table_name='content')
    op.drop_index('content_h3_idx', table_name='content')
    op.drop_index('content_status_published_idx', table_name='content')
    op.drop_index('content_creator_created_idx', table_name='content')
    op.drop_table('content')
