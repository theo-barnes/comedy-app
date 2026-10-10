# Event Schema Migration Safety Plan

## Status and Incident Signal

Status: prevention controls implemented; production diagnosis/recovery evidence pending.

After PR #25 introduced managed gig-poster schema, users reported:

- venue gig listing: `GET /v1/venues/{venueId}/events` returns 500;
- native venue gig publishing: `POST /v1/events/native` returns 500.

The likely shared cause is a deployed API artifact ahead of its Alembic schema. The new event ORM
always reads poster columns and native creation writes `poster_revision`; those fields arrive in
revision `0010_gig_posters`. The repository previously had no deployment migration command or
CI proof that migrations run against a real database. This is an evidence-backed hypothesis, not
a confirmed production root cause until an operator captures the traceback and database revision.

Risk: high — public event availability, migrations and production release safety.

## Recovery First

1. Identify the deployed backend service without exposing credentials.
2. Capture the first traceback and compare `alembic current`/`alembic heads` from the deployed
   image against the production database. Confirm the five event poster columns read-only.
3. If revision `0010_gig_posters` is missing, take/confirm normal backup/PITR and run the
   immutable-image release command once:

   ```sh
   cd /app
   python scripts/migrate.py
   ```

4. Verify `/health`, `/ready`, existing venue list, poster-free native creation, reload and
   eligible Home projection. Check that failed/retried requests did not create duplicate gigs.
5. If the cause differs or migration cannot complete, preserve the additive schema/data and roll
   API code back to the pre-poster artifact. Do not run Alembic downgrade as an application
   rollback.

See [Operator Tasks](../../OPERATOR-TASKS.md) for exact credential-safe diagnostic SQL and release
evidence requirements. Poster writes and destructive cleanup stay disabled during recovery.

## Implemented Prevention Controls

- [Release migration command](../../../backend/scripts/migrate.py): validates configured database
  presence, takes a PostgreSQL advisory lock, records revision identifiers without a URL, then
  runs `alembic upgrade head`. It is copied into the API image and must run before API/worker
  rollout, not at every scaled process startup.
- [Schema readiness checker](../../../backend/src/shared/schema_readiness.py): derives Alembic
  heads from the bundled artifact and compares them directly to `alembic_version`, without
  touching ORM tables.
- [API admission gate](../../../backend/src/main.py): normal requests return a credential-free
  503 for unreachable, unknown or behind configured schemas; `/health` remains liveness and
  `/ready` reports readiness. No-database fake-development mode remains explicitly degraded/ready.
- [CI migration contract](../../../.github/workflows/ci.yml): applies all revisions to clean
  disposable PostGIS and executes an actual `EventRow` projection, catching missing mapped
  columns after migration.

## Validation and Follow-up

- Focused readiness/migration/event/poster regression tests: 78 passed.
- Agent-run full fake backend suite: 260 passed.
- New CI service must complete on GitHub before calling the real-PostGIS migration path proven.
- Run staging migration command, `/ready` and event smoke journey before production recovery.
- Add provider-specific deployment wiring after the hosting platform is identified; the repository
  deliberately supplies the immutable-image command rather than guessing a provider configuration.

## Acceptance

- A production API behind its bundled schema does not serve normal traffic as 500 responses.
- One serialized release job migrates first; only then can API/worker traffic become ready.
- CI catches a missing Alembic application and event ORM/schema mismatch from a clean database.
- Production recovery has recorded revision, schema, route and duplicate-gig evidence.
