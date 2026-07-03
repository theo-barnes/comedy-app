"""create daily stats rollup tables

Revision ID: 0007_stats
Revises: 0006_engagement
Create Date: 2026-07-02
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0007_stats'
down_revision: str | None = '0006_engagement'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        'content_stats_daily',
        sa.Column('content_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('views', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('completions', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('shares', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('ticket_clicks', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('watch_seconds', sa.Float(), nullable=False, server_default=sa.text('0')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('content_id', 'date', name='content_stats_daily_pkey'),
    )
    op.create_index('content_stats_daily_date_idx', 'content_stats_daily', ['date'])

    op.create_table(
        'creator_stats_daily',
        sa.Column('creator_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('followers_gained', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('profile_views', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('total_views', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('creator_id', 'date', name='creator_stats_daily_pkey'),
    )
    op.create_index('creator_stats_daily_date_idx', 'creator_stats_daily', ['date'])

    for table in ('content_stats_daily', 'creator_stats_daily'):
        op.execute(f'ALTER TABLE {table} ENABLE ROW LEVEL SECURITY')


def downgrade() -> None:
    op.drop_table('creator_stats_daily')
    op.drop_table('content_stats_daily')
