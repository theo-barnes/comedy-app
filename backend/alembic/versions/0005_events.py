"""create events and event_comedians tables

Revision ID: 0005_events
Revises: 0004_content_media
Create Date: 2026-07-02
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geometry

revision: str = '0005_events'
down_revision: str | None = '0004_content_media'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

EVENT_STATUSES = ('scheduled', 'cancelled')


def upgrade() -> None:
    op.create_table(
        'events',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=False), primary_key=True,
                  server_default=sa.text('gen_random_uuid()')),
        sa.Column('venue_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('venue_profiles.user_id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('place_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('places.id', ondelete='SET NULL'), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('h3_index', sa.String(length=20), nullable=True),
        sa.Column('center', Geometry('POINT', srid=4326), nullable=True),
        sa.Column('ticket_url', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False,
                  server_default=sa.text("'scheduled'")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.CheckConstraint(f"status in {EVENT_STATUSES!r}", name='events_status_check'),
        sa.CheckConstraint('end_time is null or end_time > start_time',
                           name='events_time_order_check'),
    )
    op.create_index('events_venue_start_idx', 'events', ['venue_id', 'start_time'])
    op.create_index('events_start_idx', 'events', ['start_time'])
    op.create_index('events_h3_idx', 'events', ['h3_index'])
    op.create_index('events_place_idx', 'events', ['place_id'])
    op.create_index('events_center_gix', 'events', ['center'], postgresql_using='gist')

    op.create_table(
        'event_comedians',
        sa.Column('event_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('events.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('comedian_id', sa.dialects.postgresql.UUID(as_uuid=False),
                  sa.ForeignKey('comedian_profiles.user_id', ondelete='CASCADE'),
                  primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_index('event_comedians_comedian_idx', 'event_comedians', ['comedian_id'])

    # Content created in 0004 can now reference events.
    op.create_foreign_key(
        'content_event_fk', 'content', 'events', ['event_id'], ['id'], ondelete='SET NULL'
    )

    for table in ('events', 'event_comedians'):
        op.execute(f'alter table {table} enable row level security')


def downgrade() -> None:
    op.drop_constraint('content_event_fk', 'content', type_='foreignkey')
    op.drop_index('event_comedians_comedian_idx', table_name='event_comedians')
    op.drop_table('event_comedians')
    op.drop_index('events_center_gix', table_name='events')
    op.drop_index('events_place_idx', table_name='events')
    op.drop_index('events_h3_idx', table_name='events')
    op.drop_index('events_start_idx', table_name='events')
    op.drop_index('events_venue_start_idx', table_name='events')
    op.drop_table('events')
