# Required Gig Images Execution Plan

Status: implemented; CI PostGIS and live rollout acceptance pending, 2026-10-11. Risk: high.
Decision: [Required image publication](../../decisions/2026-10-11-required-gig-images.md).

## Approved Scope

- One primary photo/poster is required for every public venue gig.
- Owner-only preparations are allowed, but are never publicly posted.
- Existing image-less gigs remain preserved privately until completed by their venue.
- Keep the provisional form, management and owner-list layout; no redesign.
- Reuse Supabase storage, processing, signed TUS, revision CAS and publication journals.
- No galleries, promoter ownership, promotional posts, articles or connector work.

## Baseline and Audit

PR #23 delivered immediate venue gig creation; PR #24 added poster planning and persistent UI
memory; PR #25 delivered optional-image creation and management; PR #26 delivered schema readiness
and migration protection. The optional publication contract is superseded, not retroactively
claimed correct.

Railway development was upgraded from `0009` to `0010_gig_posters` on 2026-10-10. On 2026-10-11,
fresh `origin/main` included PR #26 and public `/ready` returned 200. Storage provisioning,
authenticated capability, Railway release settings and device upload acceptance remain unverified.

Audit checks reproduced the old contract: six selected pytest cases and three selected Jest cases
passed while asserting image-less publication, partial public success and image removal.

## Implementation

1. Add publication state, draft-safe defaults, complete-public-image constraints and a new migration.
   Preserve event IDs and data; valid managed references remain published, image-less records become
   private. Keep schedule status separate.
2. Add idempotent private preparation and explicit final publication with ready, owned, event-bound
   artwork. Commit the event publication/reference and asset attachment in the same SQL transaction.
3. Close native/legacy publication bypasses, sole-image removal, and draft exposure in public
   details/lists/Home/linked projections. Add explicit owner reads and completion.
4. Remove optional poster gating. Media/config incompatibility blocks publication and surfaces
   errors; it cannot hide the required field or permit no-image fallback.
5. Reuse the provisional form and image picker with required validation, honest progress,
   same-draft retry/restart, strict old-journal reconciliation and replacement-only public management.
6. Replace optional-success tests with lifecycle/visibility/fault/concurrency regressions. Validate
   the new migration/constraints in the existing clean PostGIS CI job.

## Acceptance

- Missing/unready/foreign image never publishes, including direct legacy route attempts.
- Valid details and image produce exactly one public gig; success is shown only after finalization.
- Failed/interrupted upload or publication leaves a recoverable owner-only preparation.
- Other viewers cannot retrieve or hydrate drafts; owner lists include migrated incomplete records.
- Replacement retains the existing public image; removing the only public image is rejected.
- Storage outage does not break existing reads or restore optional publication.
- No runtime optional-poster product gate remains in the corrected client path.

## Rollout and Rollback

Pause event writes and drain incompatible API/worker revisions before applying the new migration.
Deploy visibility-aware code, verify schema readiness, invalidate event/linked feed caches, and
release the compatible client. Legacy clients get an explicit update-required response, not false
publication success. Do not roll back to a backend that exposes private preparations.

Verify Supabase bucket/RLS and signed TUS in non-production; configure backend-only credentials
through the secret manager, never Expo public variables. Keep cleanup dry-run. Record actual
iOS/Android create/retry/replace/Home and private-original isolation evidence separately from tests.

## Validation and Remaining Work

Commands/evidence on 2026-10-11:

- `cd backend && DISCOVERY_DATABASE_URL='' DISCOVERY_REDIS_URL='' .venv/bin/python -m pytest tests/ -q`:
  328 passed, 13 opt-in PostGIS cases skipped.
- After the final legacy-response correction, focused native/idempotency/required-image/PostGIS
  test collection: 93 passed, 13 opt-in cases skipped. The added assertion first failed, proving
  the previous legacy endpoint incorrectly returned success for an existing private draft.
- `pnpm exec jest --runInBand --runTestsByPath __tests__/features/events/*test* __tests__/lib/api/events*.test.* __tests__/lib/api/gig-posters.test.tsx --silent`:
  129 passed across 10 suites.
- `pnpm test:focused --runTestsByPath __tests__/features/home/venue/VenueHome.test.tsx --detectOpenHandles --silent`:
  8 passed, process exited successfully.
- Expanded Home/video batch: all 157 assertions passed after correcting an obsolete optional-gate
  owner-list assertion, but the runner did not terminate. The expanded process was stopped;
  this is not reported as a normally completed successful command.
- `pnpm typecheck`: passed independently; targeted ESLint, Prettier and governance checks passed.
- `pnpm exec expo export --platform ios --platform android --output-dir <session-artifact>`:
  both production native bundles compiled. No simulator was already booted; prior simulator
  permission was declined, so no device run is claimed.
- Real local PostgreSQL 16 disposable database attempt: migration setup failed because the
  PostGIS extension control file is unavailable, before application scenarios ran. The configured
  application database was not used; the task-created disposable database was removed.
  The existing PostGIS CI job now creates a separate empty database and executes the opt-in
  migration/backfill/constraint/finalizer suite; require its result before merge/rollout.

Independent source reviews covered client/backend correctness. Two route recovery/navigation
issues were corrected and regression-tested. No new live setup, device acceptance or production
activation is claimed. Storage setup/privacy, native journey, CI PostGIS and coordinated deployment
remain release prerequisites recorded in Operator Tasks.
