"""align media_assets.status default with the 0008 lifecycle values

Revision ID: 0009_media_status_default
Revises: 0008_video_media_lifecycle
Create Date: 2026-10-03

0008 renamed 'pending' -> 'pending_upload' in the check constraint and existing rows but left
the column default at 'pending', so every new media asset insert that relied on the default
violated media_assets_status_check.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = '0009_media_status_default'
down_revision: str | None = '0008_video_media_lifecycle'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        'media_assets', 'status', existing_type=sa.String(20), existing_nullable=False,
        server_default='pending_upload',
    )


def downgrade() -> None:
    op.alter_column(
        'media_assets', 'status', existing_type=sa.String(20), existing_nullable=False,
        server_default='pending',
    )
