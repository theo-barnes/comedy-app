"""Preserve incomplete gigs privately and require a complete public image."""

import sqlalchemy as sa
from alembic import op

revision = '0011_required_gig_images'
down_revision = '0010_gig_posters'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('events', sa.Column(
        'publication_status', sa.String(20), nullable=False, server_default='draft',
    ))
    op.execute("""
        UPDATE events AS e SET publication_status = 'published'
        FROM image_assets AS a
        WHERE e.poster_asset_id = a.id
          AND a.event_id = e.id AND a.owner_id = e.venue_id
          AND a.purpose = 'gig-poster' AND a.status = 'attached'
          AND a.output_type IN ('image/jpeg', 'image/png', 'image/webp')
          AND length(btrim(a.display_key)) > 0
          AND e.poster_url IS NOT NULL AND length(btrim(e.poster_url)) > 0
          AND e.poster_width > 0 AND e.poster_height > 0
          AND a.width = e.poster_width AND a.height = e.poster_height
    """)
    op.create_check_constraint(
        'events_publication_status_check', 'events',
        "publication_status IN ('draft', 'published')",
    )
    op.create_check_constraint(
        'events_published_image_check', 'events',
        "publication_status <> 'published' OR (poster_asset_id IS NOT NULL "
        "AND poster_url IS NOT NULL AND length(btrim(poster_url)) > 0 "
        "AND poster_width IS NOT NULL AND poster_width > 0 "
        "AND poster_height IS NOT NULL AND poster_height > 0)",
    )


def downgrade() -> None:
    op.drop_constraint('events_published_image_check', 'events', type_='check')
    op.drop_constraint('events_publication_status_check', 'events', type_='check')
    op.drop_column('events', 'publication_status')
