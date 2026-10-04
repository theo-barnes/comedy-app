# Public Profiles

## Scope

Add basic self and visited profile screens that both display an account name.
The Profile tab reads the authenticated viewer's existing profile state. Discover
username taps push a visited-profile route backed by a new authenticated API that
returns only a target account ID and display name.

## Risk

High. `public.profiles` contains private location data and is owner-readable
only. The new backend read must explicitly allowlist `id` and `display_name`; it
must not broaden Supabase RLS or expose role, email, city, or coordinates.

## Decisions

- Keep `MyProfileScreen` and `PublicProfileScreen` as separate containers.
- Share only a pure `ProfileIdentity` presentation component.
- Keep the public account API separate from optional creator profiles, which can
  be absent for valid Discover uploaders and use different names.
- Keep visited profiles authenticated, matching the existing authenticated feed.
- Validate visited-profile path IDs as UUIDs before the repository query.
- Return `Creator` for legacy blank display names, matching feed hydration.
- Defer profile enrichment, editing, clips, follows, avatars, and social actions.

## Acceptance Checks

- Discover username tap pushes a profile route using the feed `creatorId`.
- The visited screen shows only the returned account name and a back arrow.
- Back returns to the mounted Discover feed and its current clip.
- The Profile tab renders the signed-in user's name without calling the public API.
- `GET /v1/profiles/{user_id}` returns only `{ id, displayName }` for an
  authenticated caller and has no profile write or RLS change.

## Rollout and Rollback

Deploy the backend before the frontend because the visited screen depends on the
new endpoint. Roll back the frontend route/navigation independently if needed;
the read-only endpoint is compatible with existing clients and can remain or be
reverted separately. No migration, data backfill, or cache invalidation is needed.

## Validation

1. Focused fake-based backend tests for the public-profile service and SQL helper.
2. Focused frontend API, caption, Discover navigation, and profile-screen tests.
3. Full backend and frontend suites, affected lint/type checks, and device journey.
4. Confirm backend response contains no private account fields.

Completed locally:

- `DISCOVERY_DATABASE_URL='' DISCOVERY_REDIS_URL='' .venv/bin/python -m pytest tests/test_profiles.py -q` - 6 passed.
- `DISCOVERY_DATABASE_URL='' DISCOVERY_REDIS_URL='' .venv/bin/python -m pytest tests/ -q` - 136 passed.
- Focused public-profile API, profile screen, caption, and Discover navigation tests - 6 suites / 9 tests passed.
- `pnpm quality` - 79 suites / 318 tests passed.
- Affected ESLint, TypeScript, Prettier, Python compile, and diff checks - passed.

The full Jest run retains the repository's existing non-failing worker teardown warning.

## Blockers

None.

## Next Action

Deploy the backend before the frontend bundle, then verify on a physical device:
open a later Discover clip, tap the username, confirm the basic visited name,
press the left arrow, and confirm the same clip remains active. Also open the
Profile tab and confirm it shows the signed-in account name without a back arrow.
