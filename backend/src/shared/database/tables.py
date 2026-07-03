from __future__ import annotations

# Tables owned and migrated by this backend's Alembic environment.
# Alembic will refuse to touch any table not listed here, so it can never
# drop Supabase-managed tables (auth, profiles, storage, ...).
#
# Every new platform migration MUST add its tables to this set.
PLATFORM_TABLES: frozenset[str] = frozenset(
    {
        # location domain
        'places',
        'place_hierarchy',
        'discovery_cache',
        # creators domain
        'comedian_profiles',
        'venue_profiles',
        # social domain
        'follows',
        'content_reports',
        'user_blocks',
        # content domain
        'content',
        'media_assets',
        # events domain
        'events',
        'event_comedians',
        # engagement domain
        'saves',
        'likes',
        'engagement_events',
        # analytics domain
        'content_stats_daily',
        'creator_stats_daily',
    }
)
