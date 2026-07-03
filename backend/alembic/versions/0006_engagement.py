"""create engagement tables: saves, likes, engagement_events

Revision ID: 0006_engagement
Revises: 0005_events
Create Date: 2026-07-02
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0006_engagement'
down_revision: str | None = '0005_events'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

ENGAGEMENT_EVENT_TYPES = (
    'video_viewed',
    'video_completed',
    'video_shared',
    'profile_viewed',
    'ticket_clicked',
)


def upgrade() -> None:
    op.create_table(
        'saves',
        sa.Column('user_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('content_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('content.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('user_id', 'content_id', name='saves_pkey'),
    )
    op.create_index('saves_user_created_idx', 'saves', ['user_id', 'created_at'])
    op.create_index('saves_content_idx', 'saves', ['content_id'])

    op.create_table(
        'likes',
        sa.Column('user_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('content_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('content.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('user_id', 'content_id', name='likes_pkey'),
    )
    op.create_index('likes_content_idx', 'likes', ['content_id'])

    op.create_table(
        'engagement_events',
        sa.Column('id', sa.BigInteger(), sa.Identity(always=True), primary_key=True),
        sa.Column('user_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('content_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=True),
        sa.Column('event_type', sa.String(length=30), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('metadata', sa.dialects.postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.CheckConstraint(
            f"event_type in {ENGAGEMENT_EVENT_TYPES!r}", name='engagement_event_type_check'
        ),
    )
    op.create_index(
        'engagement_events_content_occurred_idx',
        'engagement_events',
        ['content_id', 'occurred_at'],
    )
    op.create_index(
        'engagement_events_occurred_idx', 'engagement_events', ['occurred_at']
    )

    for table in ('saves', 'likes', 'engagement_events'):
        op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    op.drop_table('engagement_events')
    op.drop_table('likes')
    op.drop_table('saves')
