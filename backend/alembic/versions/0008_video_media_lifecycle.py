"""expand video media lifecycle and upload attempts

Revision ID: 0008_video_media_lifecycle
Revises: 0007_stats
Create Date: 2026-08-18
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0008_video_media_lifecycle'
down_revision: str | None = '0007_stats'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_constraint('media_assets_content_uq', 'media_assets', type_='unique')
    op.drop_constraint('media_assets_status_check', 'media_assets', type_='check')
    op.execute("update media_assets set status = case status when 'pending' then 'pending_upload' when 'errored' then 'failed' else status end")

    op.add_column('media_assets', sa.Column('attempt_number', sa.Integer(), nullable=False,
                                            server_default='1'))
    op.add_column('media_assets', sa.Column('is_current', sa.Boolean(), nullable=False,
                                            server_default=sa.text('true')))
    op.add_column('media_assets', sa.Column('upload_protocol', sa.String(20), nullable=False,
                                            server_default='tus'))
    op.add_column('media_assets', sa.Column('upload_expires_at', sa.DateTime(timezone=True)))
    op.add_column('media_assets', sa.Column('source_mime_type', sa.String(100)))
    op.add_column('media_assets', sa.Column('source_size_bytes', sa.BigInteger()))
    op.add_column('media_assets', sa.Column('original_filename', sa.String(255)))
    op.add_column('media_assets', sa.Column('provider_error_code', sa.String(100)))
    op.add_column('media_assets', sa.Column('uploaded_at', sa.DateTime(timezone=True)))
    op.add_column('media_assets', sa.Column('processing_started_at', sa.DateTime(timezone=True)))
    op.add_column('media_assets', sa.Column('ready_at', sa.DateTime(timezone=True)))
    op.add_column('media_assets', sa.Column('failed_at', sa.DateTime(timezone=True)))
    op.add_column('media_assets', sa.Column('last_provider_sync_at', sa.DateTime(timezone=True)))

    op.create_check_constraint(
        'media_assets_status_check', 'media_assets',
        "status in ('pending_upload','uploaded','processing','ready','failed','expired','cancelled')",
    )
    op.create_check_constraint(
        'media_assets_source_size_check', 'media_assets',
        'source_size_bytes is null or source_size_bytes > 0',
    )
    op.create_index('media_assets_current_uq', 'media_assets', ['content_id'], unique=True,
                    postgresql_where=sa.text('is_current'))
    op.create_index('media_assets_active_status_idx', 'media_assets', ['status', 'updated_at'],
                    postgresql_where=sa.text("status in ('pending_upload','uploaded','processing')"))
    op.create_index(
        'content_public_video_published_idx', 'content', ['published_at', 'id'],
        postgresql_where=sa.text("status='published' and visibility='public' and type='video_clip'"),
    )


def downgrade() -> None:
    op.drop_index('content_public_video_published_idx', table_name='content')
    op.drop_index('media_assets_active_status_idx', table_name='media_assets')
    op.drop_index('media_assets_current_uq', table_name='media_assets')
    op.drop_constraint('media_assets_source_size_check', 'media_assets', type_='check')
    op.drop_constraint('media_assets_status_check', 'media_assets', type_='check')
    op.execute("update media_assets set status = case status when 'pending_upload' then 'pending' when 'uploaded' then 'pending' when 'processing' then 'pending' when 'failed' then 'errored' when 'expired' then 'errored' when 'cancelled' then 'errored' else status end")
    for column in (
        'last_provider_sync_at', 'failed_at', 'ready_at', 'processing_started_at',
        'uploaded_at', 'provider_error_code', 'original_filename', 'source_size_bytes',
        'source_mime_type', 'upload_expires_at', 'upload_protocol', 'is_current',
        'attempt_number',
    ):
        op.drop_column('media_assets', column)
    op.create_check_constraint(
        'media_assets_status_check', 'media_assets', "status in ('pending','ready','errored')"
    )
    op.create_unique_constraint('media_assets_content_uq', 'media_assets', ['content_id'])