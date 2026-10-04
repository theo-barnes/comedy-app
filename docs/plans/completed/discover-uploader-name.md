# Discover Uploader Name

## Scope

Replace the Discover feed's `Unknown` creator name with the uploading account's
`public.profiles.display_name`. The feed response contract remains unchanged:
`creatorName` is still a required string.

## Risk

High. The backend reads Supabase-owned account data. This change is limited to a
parameterized, read-only query and does not add an ORM model, migration, allowlist
entry, RLS policy, or write path for `public.profiles`.

## Root Cause

`SqlFeedRepository.hydrate()` resolves a name only through comedian and venue
profile tables. Upload authorization accepts a comedian or venue role without
requiring either profile row, so eligible uploaders can reach the feed with no
matching profile and receive `Unknown`.

## Decisions

- Display the account's `public.profiles.display_name`, not a stage or venue name.
- Use one batched parameterized query for the hydrated content creator IDs.
- Use `Creator` only when a legacy profile has no usable display name; never return
  `Unknown`.
- Defer upload title/description work to a separate change.

## Acceptance Checks

- A comedian-role uploader without a creator-profile row resolves to its account display name.
- A venue-role uploader without a creator-profile row resolves to its account display name.
- Blank and missing profile display names use the stable `Creator` fallback.
- The feed performs no profile write and its JSON schema remains compatible.
- A fan's Discover caption displays `@<display_name>` for uploaded clips.

## Validation

1. Focused backend tests for the profile-name lookup and feed hydration helper.
2. Full backend fake suite with database/Redis URLs unset.
3. Focused Discover UI test and TypeScript checks.
4. Hosted-dev journey: upload as comedian and venue, inspect `/v1/feed/videos`, then verify fan Discover captions.

Completed locally:

- `DISCOVERY_DATABASE_URL='' DISCOVERY_REDIS_URL='' .venv/bin/python -m pytest tests/test_feed.py -q` - 18 passed.
- `DISCOVERY_DATABASE_URL='' DISCOVERY_REDIS_URL='' .venv/bin/python -m pytest tests/ -q` - 130 passed.
- `pnpm test:ci -- __tests__/features/discover/DiscoverFeed.test.tsx` - passed.
- `pnpm typecheck`, changed-test ESLint, and changed Markdown/TypeScript Prettier checks - passed.

The backend virtualenv does not provide `ruff`; editor diagnostics cannot resolve `sqlalchemy` in
the configured workspace interpreter, while the backend virtualenv successfully imported and
executed the changed repository tests.

## Rollout and Rollback

Deploy the backend change first; existing frontend clients already consume
`creatorName`. Cached feed snapshots refresh on their normal TTL/refetch. Revert
the repository change if profile reads fail or display incorrect data; no data
migration or cleanup is necessary.

## Next Action

Review, commit, push, and perform the hosted-dev comedian and venue upload journey after backend
deployment.
