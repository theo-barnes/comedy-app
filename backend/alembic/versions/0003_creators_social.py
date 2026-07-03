"""create creator profiles, follows, and safety tables

Revision ID: 0003_creators_social
Revises: 0002_migrate_legacy
Create Date: 2026-07-02
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0003_creators_social'
down_revision: str | None = '0002_migrate_legacy'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

REPORT_TARGET_TYPES = ('content', 'creator')
REPORT_STATUSES = ('open', 'reviewed', 'actioned', 'dismissed')

# NOTE: user ids reference Supabase auth.users logically, but no cross-schema
# FK is declared so migrations run against plain Postgres in local dev and the
# schema stays decoupled from Supabase internals.


def upgrade() -> None:
    op.create_table(
        'comedian_profiles',
        sa.Column('user_id', sa.dialects.postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('stage_name', sa.Text(), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('genres', sa.dialects.postgresql.ARRAY(sa.Text()), nullable=False,
                  server_default=sa.text("'{}'")),
        sa.Column('verified', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    op.create_table(
        'venue_profiles',
        sa.Column('user_id', sa.dialects.postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('venue_name', sa.Text(), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('capacity', sa.Integer(), nullable=True),
        sa.Column('place_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('places.id', ondelete='SET NULL'), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('verified', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('venue_profiles_place_idx', 'venue_profiles', ['place_id'])

    op.create_table(
        'follows',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=False), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('follower_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('creator_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.UniqueConstraint('follower_id', 'creator_id', name='follows_pair_uq'),
        sa.CheckConstraint('follower_id <> creator_id', name='follows_no_self_check'),
    )
    op.create_index('follows_creator_idx', 'follows', ['creator_id'])
    op.create_index('follows_follower_created_idx', 'follows', ['follower_id', 'created_at'])

    op.create_table(
        'content_reports',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=False), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('reporter_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('target_type', sa.String(length=20), nullable=False),
        sa.Column('target_id', sa.dialects.postgresql.UUID(as_uuid=False), nullable=False),
        sa.Column('reason', sa.Text(), nullable=False),
        sa.Column('details', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default=sa.text("'open'")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.CheckConstraint(f"target_type in {REPORT_TARGET_TYPES!r}",
                           name='content_reports_target_type_check'),
        sa.CheckConstraint(f"status in {REPORT_STATUSES!r}", name='content_reports_status_check'),
    )
    op.create_index('content_reports_status_created_idx', 'content_reports',
                    ['status', 'created_at'])

    op.create_table(
        'user_blocks',
        sa.Column('blocker_id', sa.dialects.postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('blocked_id', sa.dialects.postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.CheckConstraint('blocker_id <> blocked_id', name='user_blocks_no_self_check'),
    )

    # Defense in depth: platform tables are only reachable through this
    # backend. Enabling RLS with no policies denies any direct PostgREST
    # access from app clients; the backend's role owns the tables and is
    # unaffected.
    for table in ('comedian_profiles', 'venue_profiles', 'follows', 'content_reports',
                  'user_blocks'):
        op.execute(f'alter table {table} enable row level security')


def downgrade() -> None:
    op.drop_table('user_blocks')
    op.drop_index('content_reports_status_created_idx', table_name='content_reports')
    op.drop_table('content_reports')
    op.drop_index('follows_follower_created_idx', table_name='follows')
    op.drop_index('follows_creator_idx', table_name='follows')
    op.drop_table('follows')
    op.drop_index('venue_profiles_place_idx', table_name='venue_profiles')
    op.drop_table('venue_profiles')
    op.drop_table('comedian_profiles')
