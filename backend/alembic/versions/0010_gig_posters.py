"""Add durable gig poster assets, event projections and native-create idempotency."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = '0010_gig_posters'
down_revision = '0009_media_status_default'
branch_labels = None
depends_on = None


def upgrade() -> None:
    uuid = postgresql.UUID(as_uuid=False)
    op.add_column('events', sa.Column('poster_asset_id', uuid, nullable=True))
    op.add_column('events', sa.Column('poster_url', sa.Text(), nullable=True))
    op.add_column('events', sa.Column('poster_revision', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('events', sa.Column('poster_width', sa.Integer(), nullable=True))
    op.add_column('events', sa.Column('poster_height', sa.Integer(), nullable=True))
    op.create_check_constraint('events_poster_revision_check', 'events', 'poster_revision >= 0')
    op.create_table(
        'native_event_submissions',
        sa.Column('owner_id', uuid, primary_key=True),
        sa.Column('key', uuid, primary_key=True),
        sa.Column('payload_hash', sa.String(64), nullable=False),
        sa.Column('event_id', uuid, sa.ForeignKey('events.id', ondelete='CASCADE'), nullable=False),
    )
    op.create_table(
        'image_assets',
        sa.Column('id', uuid, primary_key=True),
        sa.Column('owner_id', uuid, nullable=False),
        sa.Column('event_id', uuid, nullable=False),
        sa.Column('purpose', sa.String(30), nullable=False),
        sa.Column('status', sa.String(30), nullable=False),
        sa.Column('content_type', sa.String(30), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        *[sa.Column(name, sa.Text(), nullable=False, unique=True) for name in (
            'upload_key', 'original_key', 'prepared_key', 'display_key',
        )],
        sa.Column('output_type', sa.String(30), nullable=True),
        sa.Column('width', sa.Integer(), nullable=True),
        sa.Column('height', sa.Integer(), nullable=True),
        *[sa.Column(name, sa.DateTime(timezone=True), nullable=False) for name in (
            'created_at', 'touched_at', 'expires_at',
        )],
        sa.CheckConstraint("purpose = 'gig-poster'", name='image_assets_purpose_check'),
        sa.CheckConstraint(
            "status IN ('uploading', 'ready', 'attached', 'retired', 'failed', 'deleted')",
            name='image_assets_status_check',
        ),
    )
    op.create_index('image_assets_cleanup_idx', 'image_assets', ['status', 'touched_at'])
    op.create_index('image_assets_event_idx', 'image_assets', ['event_id'])
    op.create_index('events_poster_asset_idx', 'events', ['poster_asset_id'])
    # Backend-owned tables are never an app-facing Supabase persistence API.
    op.execute('ALTER TABLE image_assets ENABLE ROW LEVEL SECURITY')
    op.execute('ALTER TABLE native_event_submissions ENABLE ROW LEVEL SECURITY')
    op.execute('REVOKE ALL ON image_assets, native_event_submissions FROM PUBLIC')
    # The standalone local platform Postgres has no Supabase roles.
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
                REVOKE ALL ON image_assets, native_event_submissions FROM anon;
            END IF;
            IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
                REVOKE ALL ON image_assets, native_event_submissions FROM authenticated;
            END IF;
        END;
        $$;
    """)


def downgrade() -> None:
    op.drop_index('events_poster_asset_idx', table_name='events')
    op.drop_table('native_event_submissions')
    op.drop_table('image_assets')
    op.drop_constraint('events_poster_revision_check', 'events', type_='check')
    for name in ('poster_height', 'poster_width', 'poster_revision', 'poster_url', 'poster_asset_id'):
        op.drop_column('events', name)
