# Operator Tasks — actions required outside the codebase

Tasks only you can complete (dashboards, accounts, local machine). This file is the single
source of truth for out-of-repo work, sequenced by cost: **Phase A is free — do it this month.**
**Phase B needs the budget that unlocks at the start of next month** and builds directly on
Phase A. Tick items off as you go.

Decisions locked in (2026-09-13):

- The current Supabase project has no real users and is now officially the **development**
  environment; a dedicated production project is created at launch (Phase C).
- The backend's Alembic-owned tables live in the Supabase dev Postgres (PostGIS enabled) — no
  separate hosted database. Redis is skipped in dev; the cache degrades to in-memory.
- October paid scope: Apple Developer Program (~$99/yr), hosted dev API + worker (~$10–25/mo),
  Cloudflare Stream (~$5/mo minimum), domain purchase.

## Phase A — this month (free: security + hosted-backend prerequisites)

### A1. Apply the database migrations to the Supabase dev project

The repo now versions the schema under `supabase/migrations/` (baseline + role-escalation fix,
plus two 2026-09-13 drift fixes below). The Supabase CLI is installed as a dev dependency
(`pnpm supabase ...`).

```sh
pnpm supabase login
pnpm supabase link --project-ref <PROJECT-REF>
pnpm supabase db push
```

If the CLI prompts `[Y/n]` and appears to hang, you likely piped its output (e.g. `| tail`) —
run it unpiped, or pass `--yes` to skip the prompt.

**Schema drift found and fixed on 2026-09-13** (present on this project before that date; apply
once, safe to re-run):

- `profiles.role` had a `NOT NULL` constraint predating the versioned migrations. `create table
if not exists` never alters an existing column, so it silently survived every push and broke
  any sign-up that doesn't supply a role immediately (OAuth sign-up, or the "select role after
  sign-up" flow). Fixed by `20260913000100_profiles_role_nullable.sql`.
- `profiles` was missing table-level `GRANT SELECT, UPDATE ... TO authenticated`. Tables created
  via CLI-applied migrations don't inherit the Dashboard SQL editor's default ACLs, so every
  authenticated update (including the in-app role-selection screen) failed with Postgres's own
  `42501 permission denied for table profiles` before RLS was ever evaluated. Fixed by
  `20260913000200_profiles_grants.sql`.

The migrations are idempotent (`if not exists` / `drop ... if exists` guards) so they apply
cleanly onto your existing dashboard-managed schema. `supabase db push` reporting the remote
database as up to date confirms this step is done.

**Verify the escalation fix worked.** The immutability trigger only fires once a profile's
`role` is already non-null, so a fresh account needs a role set first. Run the bundled script,
which creates a throwaway account and drives both PATCH calls (avoids multi-line curl blocks
breaking on copy-paste):

```sh
SUPABASE_URL=https://<project-ref>.supabase.co ANON_KEY=<anon-key> \
  ./scripts/verify-role-immutability.sh
```

If `.env.local` already has `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` set, the
script reads those automatically and the inline `SUPABASE_URL=`/`ANON_KEY=` prefix can be omitted.

Expected: step 3's output shows `"role":"fan"`; step 4's output contains
`role is immutable once set`.

- [x] `supabase link` + `db push` completed
- [x] Escalation test rejected

### A2. Confirm RLS is enabled on every table

Dashboard → Database → Tables: every table in `public` must show RLS **enabled**.
The migrations enforce it for `profiles`; check anything created manually.

- [x] All tables show RLS enabled

### A3. Supabase Auth dashboard hardening

Dashboard → Authentication:

- [x] **Password policy**: minimum 8 characters + require letters/digits mix
      (Settings → Auth → Passwords) — matches the client-side Zod rule
- [x] **Leaked password protection**: enable (checks against HaveIBeenPwned)
- [x] **Redirect URLs**: allowlist exactly `cue://auth-callback` (remove
      `comedy-app://auth-callback` and any wildcard entries)
- [x] **Rate limits**: review Auth rate limits (tighten if on a paid plan)

### A4. Secret hygiene

Git history was checked on 2026-06-10: no `.env` / `.env.local` ever committed, and the working
tree only tracks `.env.example`. No rotation needed unless you've shared keys elsewhere.

- [ ] Confirm the anon key hasn't been pasted into chats/docs/screenshots; rotate in
      Dashboard → Settings → API if unsure

### A5. Asymmetric JWT signing keys — blocking for the hosted backend

Dashboard → Settings → Auth → JWT Keys → migrate to **asymmetric (ECC/RSA) signing keys**.
The FastAPI backend verifies user JWTs via the project's JWKS endpoint
(`DISCOVERY_SUPABASE_URL`); until asymmetric keys are enabled, a hosted deployment cannot
authenticate anyone. Do this before any Phase B deploy.

- [x] Migrated to asymmetric signing keys

- Current Key type ECC (P-256)
  Public Key Set:
  {
  "keys": [
  {
  "x": "QMfhnWhH3sRrG3SdoYGVhipl1aX6qtDsGIJsH3InnmI",
  "y": "ffjBai1ui4S62j0pEkttyo36EzRdL91EWbJR9yNiE60",
  "alg": "ES256",
  "crv": "P-256",
  "ext": true,
  "kid": "6d708f61-f9eb-4f7f-8d76-e98262a76eb8",
  "kty": "EC",
  "key_ops": [
  "verify"
  ]
  }
  ]
  }

https://kwezyzbqbmkcagmglspk.supabase.co/auth/v1/.well-known/jwks.json returns:
{"keys":[{"alg":"ES256","crv":"P-256","ext":true,"key_ops":["verify"],"kid":"6d708f61-f9eb-4f7f-8d76-e98262a76eb8","kty":"EC","use":"sig","x":"QMfhnWhH3sRrG3SdoYGVhipl1aX6qtDsGIJsH3InnmI","y":"ffjBai1ui4S62j0pEkttyo36EzRdL91EWbJR9yNiE60"}]}

- [x] `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json` serves at least one key

### A6. Enable PostGIS and apply backend migrations to Supabase Postgres

The backend consolidates onto the Supabase dev database — no separate hosted Postgres. Its
Alembic config only touches the allowlisted platform/location tables, so Supabase-managed
auth/RLS tables are safe.

1. Dashboard → Database → Extensions → enable `postgis`.
2. Copy the **direct (session) connection string** from Dashboard → Settings → Database.
   Do not run migrations through the transaction pooler.
3. Apply:

```sh
cd backend
DISCOVERY_DATABASE_URL='postgresql://postgres:bEfpax-camgyh-9zarxi@db.kwezyzbqbmkcagmglspk.supabase.co:5432/postgres' .venv/bin/alembic upgrade head
```

- [x] `postgis` extension enabled
- [x] Alembic upgraded to head (includes `0008_video_media_lifecycle`)

### A7. Seed geography into the Supabase dev database

Discovery needs `places` rows to resolve cities and neighbourhoods:

```sh
cd backend
DISCOVERY_DATABASE_URL='postgresql://postgres:bEfpax-camgyh-9zarxi@db.kwezyzbqbmkcagmglspk.supabase.co:5432/postgres' \
  .venv/bin/discovery-ingest --cities 'San Francisco:us'
```

Then smoke-test a local API pointed at the Supabase database:

```sh
DISCOVERY_DATABASE_URL='postgresql://postgres:bEfpax-camgyh-9zarxi@db.kwezyzbqbmkcagmglspk.supabase.co:5432/postgres' \
  .venv/bin/uvicorn main:app --app-dir src --port 8000
curl "http://127.0.0.1:8000/discovery-regions?lat=37.7749&lng=-122.4194"
```

- [x] Ingest completed for at least one city
- [x] `/discovery-regions` returns regions from the Supabase-backed API

### A8. Create real dev test accounts

The in-app dev-role bypass does not create a Supabase JWT, so it cannot call the authenticated
feed/upload APIs. Create two real users via the app sign-up flow (or Dashboard → Authentication):

- [x] One `fan` account signs in successfully
- [x] One `comedian` account signs in successfully (role verified in `profiles`)

### A9. Sentry (free tier)

- [x] Create an org/project at sentry.io (React Native platform)
- [x] In `app.json`, replace `REPLACE_WITH_SENTRY_ORG` and
      `REPLACE_WITH_SENTRY_PROJECT` (under the `@sentry/react-native/expo`
      plugin) with your real org slug and project name
- [x] Put the DSN in `.env.local` as `EXPO_PUBLIC_SENTRY_DSN`
      (Sentry is a no-op until this is set, and disabled in dev builds)

The EAS environment-variable and source-map steps move to B5 (they need the funded EAS setup).

### A10. Xcode Command Line Tools + optional local database

Homebrew is currently blocked — macOS Command Line Tools are outdated.
Run `xcode-select --install` (or install CLT for Xcode 26.3 from
https://developer.apple.com/download/all/) first.

- [x] Update Xcode Command Line Tools

The Docker Postgres/Redis compose services are now an optional backend-debug path (the Supabase
dev database from A6 is canonical). To verify migrations locally:

- [x] Run `cd backend && docker compose up -d db redis`
- [x] Run `DISCOVERY_DATABASE_URL='postgresql://platform:platform@127.0.0.1:54329/platform' .venv/bin/alembic upgrade head`

### A11. GitHub repo protection

- [ ] Protect `main`: require PR + passing status checks (Settings → Branches)

### A12. Pick the hosting vendor and domain name (no spend yet)

Create the hosting account now so Phase B starts with purchases, not research. Fly.io or
Railway are good fits for a two-container (API + worker) deploy in the $10–25/mo range.

- [ ] Hosting account created
- [ ] Domain name decided (used for `api-dev.<domain>` and later Universal Links)

### A13. Rotate credentials exposed during Phase A

After completing Phase A, rotate all database passwords, API tokens, private keys, and any
other secrets entered in terminal commands, documents, or chats. Update the corresponding local
environment values and deployment secrets, then confirm the app and backend still authenticate.

- [ ] All Phase A credentials rotated and replacement values stored only in secret managers or local env files

## Phase B — next month (funded, from 1 Oct)

Suggested order: start B1 and B4 on day one (Apple approval can take days), then B2 → B3 →
B5 → B6.

### B1. Buy the domain and create the dev API hostname

- [ ] Domain purchased
- [ ] `api-dev.<domain>` DNS record pointing at the host chosen in A12

### B2. Deploy the dev API and worker

Deploy two processes from `backend/Dockerfile` on the A12 host:

- **API**: the image's default uvicorn command; the platform terminates HTTPS in front of
  port 8000; healthcheck `GET /health`.
- **Worker**: same image, command `platform-worker`. Only one scheduler instance should run.
  It performs analytics/trending jobs and checks stale media every two minutes. Configure
  restart-on-failure.

Environment for both (encrypted host secrets, never `EXPO_PUBLIC_*` values):

```text
DISCOVERY_DATABASE_URL=<supabase pooler connection string>
DISCOVERY_SUPABASE_URL=https://<project-ref>.supabase.co
DISCOVERY_SENTRY_DSN=<backend DSN, optional>
# Cloudflare values arrive in B3.
```

- [ ] `https://api-dev.<domain>/health` responds
- [ ] Worker deployed with restart policy; `media_reconciliation_complete` appears in logs
- [ ] Authenticated `/v1/feed/videos` works with an A8 account's JWT

### B3. Cloudflare Stream video setup

Create or select a Cloudflare account with Stream enabled.

1. Dashboard → **My Profile → API Tokens → Create Token**.
2. Create a custom token scoped to the Cue account with **Stream: Edit** permission only.
3. Record the account ID from the Cloudflare dashboard URL/overview.
4. Set these as encrypted backend deployment secrets, never as `EXPO_PUBLIC_*` values:

```text
DISCOVERY_CLOUDFLARE_ACCOUNT_ID=<account-id>
DISCOVERY_CLOUDFLARE_API_TOKEN=<stream-edit-token>
```

Register the dev webhook once B2 is live:

```sh
curl -X PUT \
      -H "Authorization: Bearer $DISCOVERY_CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      "https://api.cloudflare.com/client/v4/accounts/$DISCOVERY_CLOUDFLARE_ACCOUNT_ID/stream/webhook" \
      --data '{"notificationUrl":"https://api-dev.<domain>/v1/webhooks/cloudflare-stream"}'
```

Save the returned `secret` as `DISCOVERY_CLOUDFLARE_STREAM_WEBHOOK_SECRET`. Cloudflare permits
one Stream webhook subscription per account, so production will later need a separate account
or an endpoint that routes events by provider UID.

For local webhook testing, expose port 8000 with a temporary HTTPS tunnel, register
`https://<tunnel-host>/v1/webhooks/cloudflare-stream`, then restore the dev webhook.
Cloudflare cannot call localhost or private IP addresses.

- [ ] Stream account and least-privilege API token created
- [ ] Backend account ID/API token configured as encrypted secrets
- [ ] HTTPS webhook registered and returned secret configured

### B4. Apple Developer enrollment and device credentials

Start enrollment on day one — approval can take days.

- [ ] Enroll in the Apple Developer Program (needed for device builds, TestFlight,
      Associated Domains)
- [ ] Register devices: `npx eas-cli device:create`
- [ ] In Apple Developer → Certificates, Identifiers & Profiles, register App ID
      `com.billd.cue` and create an iOS Development provisioning profile for your team/device
- [ ] In Xcode, open `ios/cue.xcworkspace`, select the `cue` target → Signing & Capabilities,
      select team `8K2U73V78J`, enable **Automatically manage signing**, then build once; or use
      EAS device build so EAS manages credentials

The known local Release device build failure is exactly: no iOS App Development provisioning
profile exists for `com.billd.cue`. Code signing must be resolved before physical-device video
validation can run.

### B5. EAS environment variables and the development-device build

- [ ] In EAS dashboard → Environment variables (development environment), set:
      `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (dev project),
      `EXPO_PUBLIC_API_URL=https://api-dev.<domain>`, `EXPO_PUBLIC_SENTRY_DSN`;
      keep `.env.local` for local dev only
- [ ] Add `SENTRY_AUTH_TOKEN` (Sentry → Developer Settings → Auth Tokens) with **sensitive**
      visibility (for source-map upload)
- [ ] Confirm the iOS build image uses Xcode 26+ (required for Liquid Glass compilation)
- [ ] Build and install: `eas build --profile development-device --platform ios`
- [ ] Verify picker permissions, local preview, interrupted TUS resume, HLS playback, and
      tab-bar clearance on the device
- [ ] After your first `eas update`, upload source maps:
      `npx sentry-expo-upload-sourcemaps dist`

### B6. End-to-end acceptance — the daily iPhone loop

- [ ] Comedian account uploads a short video from the iPhone (TUS transfer completes)
- [ ] Cloudflare webhook/worker transitions it to `published`
- [ ] Its HLS URL plays in-app
- [ ] Fan account sees and plays the clip in Discover (refresh + pagination)
- [ ] The installed dev client opens and works with no Mac, Metro, or Docker running

## Phase C — pre-launch / when relevant

### C1. Universal Links / App Links (OAuth hijack fix)

The `cue://` custom scheme can be registered by other apps. Production should use domain-verified
links for the OAuth callback. The domain exists after B1:

- [ ] Host an `apple-app-site-association` (AASA) file at `https://<domain>/.well-known/`
- [ ] Add `"associatedDomains": ["applinks:<domain>"]` to `app.json` → ios (code change — ask
      for it once the domain exists)
- [ ] Android: host `assetlinks.json` and add the intent filter (paired code change)
- [ ] Update Supabase redirect allowlist to the https URL

### C2. Google OAuth (blocks the "Continue with Google" button)

- [ ] Google Cloud project + OAuth credentials (iOS & Android types)
- [ ] Redirect URI: `cue://auth-callback` (later: the Universal Link URL)
- [ ] Enable Google provider in Supabase Dashboard with Client ID/Secret
- [ ] `EXPO_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local`
- [ ] Release builds: register Android SHA-1 fingerprint

### C3. Dedicated production Supabase project

The current project is now the dev environment. Before launch, create a dedicated production
project and apply the same migrations via `supabase db push`.

- [ ] Production project created and migrated

## CI incident note — ERR_PNPM_IGNORED_BUILDS

If GitHub Actions fails on `pnpm install --frozen-lockfile` with
`ERR_PNPM_IGNORED_BUILDS`, a dependency postinstall/build script is blocked by
pnpm's supply-chain policy.

1. Identify the blocked package from the CI log (example: `@sentry/cli`).
2. Allow it in `pnpm-workspace.yaml` under `allowBuilds` with an explicit boolean:

```yaml
allowBuilds:
  '@sentry/cli': true
```

3. Validate locally with:

```sh
pnpm install --frozen-lockfile
```

4. Commit the policy change and rerun CI.

Use `false` (or remove the entry) if the build script should stay blocked.
