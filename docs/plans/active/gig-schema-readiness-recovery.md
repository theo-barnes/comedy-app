# Gig Schema Readiness Recovery

Status: app diagnostics implemented; authorized development recovery and live acceptance blocked.
Risk: high for database/deployment recovery; medium for the app error presentation.
Date: 2026-10-11.

## Confirmed Incident

The local app uses Railway's deployed development backend. Read-only public probes to
`https://api-dev.cuethecomedy.com` returned:

| Route                  | HTTP | Result                                              |
| ---------------------- | ---- | --------------------------------------------------- |
| `/health`              | 200  | `status=ok`                                         |
| `/ready`               | 503  | `status=unavailable`, `code=schema_revision_behind` |
| `/v1/venues/me/events` | 503  | Same readiness failure                              |
| `/v1/creators/me`      | 503  | Same readiness failure                              |

The [admission middleware](../../../backend/src/main.py) rejects requests before route/auth
execution when the configured database revision differs from the artifact's bundled heads.
This is a shared deployment/schema mismatch, not two gig controller defects.

The repository head is `0011_required_gig_images`; the previous operator recovery recorded
development at `0010_gig_posters`. Missing `0011` is the leading explanation, but deployed
artifact SHA, bundled head and actual database revision remain unverified. The public code
does not prove those exact values or whether pre-deploy migration was missing, failed, or
targeted a different database.

The [previous safety plan](event-schema-migration-safety.md) remains applicable. The
[required-image rollout](required-gig-images.md) governs migration visibility and rollback;
do not restore optional-image publication or remove the readiness gate.

## Implemented App Diagnostics

- The [API client](../../../src/lib/api/client.ts) retains optional error codes from validated
  readiness/domain envelopes without changing existing status/message behavior.
- One shared formatter maps recognized readiness 503 codes to a localized service-unavailable
  message. Unknown/malformed/non-JSON errors retain existing fallback behavior; domain-specific
  media errors retain their messages.
- Venue Home and all Create gig API error branches use this formatter. Retry controls, form/
  publication recovery state, image requirements and mutation retry policy remain unchanged.
- English copy uses the established locale fallback for en-US, French and German; automated
  fallback checks cover all four supported languages. No screen redesign or new dependencies.

## Recovery and Deployment Tasks

1. Obtain authorized Railway dashboard/operator evidence for development's API and worker.
   Record image/SHA, source branch, build root, current/head revisions and effective pre-deploy/
   healthcheck settings. Confirm both database targets privately without exporting URLs/secrets.
2. Confirm backup/PITR. Pause event writes and drain incompatible API/worker readers before the
   required-image visibility migration. Follow the existing required-image execution plan.
3. From the approved immutable image, run the existing release command once:

   ```sh
   cd /app && python scripts/migrate.py
   ```

   Reuse its advisory lock and revision-only logs. Never stamp the revision, downgrade, apply
   migrations from guessed credentials, or use the disposable PostGIS suite on the live database.

4. Verify current equals bundled head, preserved event IDs and publication constraints. Roll out
   compatible API/worker artifacts, invalidate affected caches and confirm `/ready` is 200/ok.
5. Configure the API's Railway pre-deploy command to the command above, after verifying image
   layout, and set the traffic healthcheck to `/ready`. Keep `/health` as diagnostic liveness.
   Set an appropriate migration timeout and verify effective settings and a no-op release.
   One release owns migrations; workers must not launch incompatible code before completion.
   Do not add migrations to every scaled process startup.
6. Record evidence in [Operator Tasks](../../OPERATOR-TASKS.md). The screenshot establishes the
   Railway service/environment, not its release settings. No settings/migration were changed here.

Railway documents [pre-deploy](https://docs.railway.com/deployments/pre-deploy-command) as
running in the built image with service variables; nonzero exit prevents rollout. Prefer verified
dashboard settings for this recovery. Do not introduce deprecated config-as-code or a broad IaC
project as an incident workaround. Existing CI proves migrations on disposable PostGIS, not that
Railway runs the release command.

## Retrieval and Upload Acceptance

- Authorized venue GETs to both affected routes succeed after recovery. Unauthenticated probes
  becoming 401 prove only admission, not authenticated functionality.
- Owner Home lists existing gigs and preserved incomplete drafts with completion actions; other
  viewers cannot retrieve those drafts.
- Verify authenticated `/v1/events/poster-config`, required Storage buckets/RLS and signed TUS
  capability. The screenshot did not list `DISCOVERY_SUPABASE_SERVICE_ROLE_KEY`; verify privately
  before diagnosing a subsequent upload failure. Never expose it to Expo public variables.
- Create one future gig with a valid required image, confirm upload/processing/final publication,
  reload and Home visibility; retry a controlled failure without creating a duplicate.
- Record actual device/simulator evidence separately from automated tests. Missing Storage setup
  or credentials blocks upload acceptance even if retrieval recovers.
- Preserve required-image publication, private-original isolation and cleanup dry-run.

## Validation Evidence

- Public curl probes completed with command exit 0 and the HTTP results above.
- `pnpm test:focused --runTestsByPath __tests__/lib/api/client.test.ts __tests__/features/home/venue/VenueHome.test.tsx __tests__/features/events/CreateEventScreen.test.tsx __tests__/i18n/i18n.test.ts --silent`:
  102 tests passed in four suites.
- `pnpm typecheck`: passed.
- Targeted ESLint with `--max-warnings 0`: passed after correcting three test-import warnings.
- Targeted Prettier formatting: applied; final check recorded in delivery evidence.
- `pnpm validate:governance`: passed (8 governance files, 4 scoped instructions).
- PR #27's Backend migration contract, Backend tests, Typecheck/lint/tests and description checks
  were all successful when inspected. This proves its CI migration path, not deployed revisions.

Tests exercise retained readiness codes, unknown/non-JSON envelopes, domain errors, locale fallback,
Home retry/recovery, creator prerequisite retry and publication/config failure recovery without
false success. No backend code/schema changes or backend test run were needed for this client fix.

## Rollout, Rollback and Remaining Blockers

Merge/deploy the diagnostics independently; it improves failure explanation but cannot repair the
database. Deploy the reviewed migration only through authorized coordinated recovery. Stop on
migration failure and preserve data/fail-closed admission. Never use Alembic downgrade or an older
API exposing drafts as an application rollback. The app-only diagnostic change can be reverted
independently without affecting event/image contracts.

No authorized Railway access/operator revision evidence or live venue/Storage session was available.
No live migration, settings change, authenticated journey or new device/design acceptance is claimed.

Exact next action: inspect deployed `alembic current`/`alembic heads` and effective Railway release
settings, then perform the controlled development recovery and record authenticated upload acceptance.
