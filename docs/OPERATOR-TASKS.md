# Operator Tasks — actions required outside the codebase

Tasks only you can complete (dashboards, accounts, local machine). This file is the single
source of truth for out-of-repo work, sequenced by cost: **Phase A is free except for the
domain purchase — do it this month.** **Phase B needs the budget that unlocks at the start of
next month** and builds directly on Phase A. Tick items off as you go.

Decisions locked in (2026-09-13):

- The current Supabase project has no real users and is now officially the **development**
  environment; a dedicated production project is created at launch (Phase C).
- The backend's Alembic-owned tables live in the Supabase dev Postgres (PostGIS enabled) — no
  separate hosted database. Redis is skipped in dev; the cache degrades to in-memory.
- October paid scope: Apple Developer Program (~$99/yr), hosted dev API + worker (~$10–25/mo),
  Cloudflare Stream (~$5/mo minimum), domain purchase.

## Phase A — this month (security + hosted-backend prerequisites)

### Completed foundations

- Supabase migrations are applied; the role-escalation verification passed. The idempotent drift
  migrations keep `profiles.role` nullable and grant authenticated profile reads/updates.
- RLS is enabled on every `public` table.
- Supabase Auth has the 8-character letter-and-digit password policy, leaked-password protection,
  reviewed rate limits, and only `cue://auth-callback` allowlisted.
- Asymmetric ES256 JWT signing is enabled and the project's JWKS endpoint is available. This is
  required for the hosted backend's JWT verification.
- PostGIS is enabled, backend Alembic is at `0008_video_media_lifecycle`, and San Francisco
  geography was seeded and verified through the Supabase-backed API.
- Real dev `fan` and `comedian` accounts exist; the comedian role was verified in `profiles`.
- Sentry's React Native project and client DSN are configured locally; EAS configuration remains
  in B4.
- Xcode Command Line Tools and the optional local Docker Postgres/Redis debug path were verified.
- `main` requires pull requests and passing status checks.
- Domains `cuethecomedy.com` and `cuethecomedy.co.uk` are registered with IONOS, with 2FA,
  registrar lock, and auto-renew enabled. Railway contains an empty `cue-dev` project.
- Naming is fixed: `cuethecomedy.com` is canonical, `cuethecomedy.co.uk` redirects to it, and
  `api-dev.cuethecomedy.com` is reserved for the hosted development API. Do not create DNS records
  until Railway provides the custom-domain target during B1.

### A13. Rotate credentials exposed during Phase A

After completing Phase A, rotate all database passwords, API tokens, private keys, and any
other secrets entered in terminal commands, documents, or chats. Update the corresponding local
environment values and deployment secrets, then confirm the app and backend still authenticate.

- [ ] All Phase A credentials rotated and replacement values stored only in secret managers or local env files

## Phase B — next month (funded, from 1 Oct)

Suggested order: start B1 and B3 on day one (Apple approval can take days), then B2 → B4 →
B5.

### B1. Deploy the dev API and worker, then attach the dev API hostname

Deploy two processes from `backend/Dockerfile` to the A12 Railway project:

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
# Cloudflare values arrive in B2.
```

After the API service is healthy, add `api-dev.cuethecomedy.com` as its Railway custom domain.
In IONOS DNS, create exactly the CNAME or other record Railway supplies, wait for Railway's TLS
validation, then set `EXPO_PUBLIC_API_URL=https://api-dev.cuethecomedy.com` in the EAS
development environment in B4. Do not point the apex domain at the API.

- [ ] `api-dev.cuethecomedy.com` attached in Railway with the exact IONOS DNS record required
- [ ] `https://api-dev.cuethecomedy.com/health` responds
- [ ] Worker deployed with restart policy; `media_reconciliation_complete` appears in logs
- [ ] Authenticated `/v1/feed/videos` works with an A8 account's JWT

### B2. Cloudflare Stream video setup

Create or select a Cloudflare account with Stream enabled.

1. Dashboard → **My Profile → API Tokens → Create Token**.
2. Create a custom token scoped to the Cue account with **Stream: Edit** permission only.
3. Record the account ID from the Cloudflare dashboard URL/overview.
4. Set these as encrypted backend deployment secrets, never as `EXPO_PUBLIC_*` values:

```text
DISCOVERY_CLOUDFLARE_ACCOUNT_ID=<account-id>
DISCOVERY_CLOUDFLARE_API_TOKEN=<stream-edit-token>
```

Register the dev webhook once B1 is live:

```sh
curl -X PUT \
      -H "Authorization: Bearer $DISCOVERY_CLOUDFLARE_API_TOKEN" \
      -H "Content-Type: application/json" \
      "https://api.cloudflare.com/client/v4/accounts/$DISCOVERY_CLOUDFLARE_ACCOUNT_ID/stream/webhook" \
      --data '{"notificationUrl":"https://api-dev.cuethecomedy.com/v1/webhooks/cloudflare-stream"}'
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

### B3. Apple Developer enrollment and device credentials

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

### B4. EAS environment variables and the development-device build

- [ ] In EAS dashboard → Environment variables (development environment), set:
      `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (dev project),
      `EXPO_PUBLIC_API_URL=https://api-dev.cuethecomedy.com`, `EXPO_PUBLIC_SENTRY_DSN`;
      keep `.env.local` for local dev only
- [ ] Add `SENTRY_AUTH_TOKEN` (Sentry → Developer Settings → Auth Tokens) with **sensitive**
      visibility (for source-map upload)
- [ ] Confirm the iOS build image uses Xcode 26+ (required for Liquid Glass compilation)
- [ ] Build and install: `eas build --profile development-device --platform ios`
- [ ] Verify picker permissions, local preview, interrupted TUS resume, HLS playback, and
      tab-bar clearance on the device
- [ ] After your first `eas update`, upload source maps:
      `npx sentry-expo-upload-sourcemaps dist`

### B5. End-to-end acceptance — the daily iPhone loop

- [ ] Comedian account uploads a short video from the iPhone (TUS transfer completes)
- [ ] Cloudflare webhook/worker transitions it to `published`
- [ ] Its HLS URL plays in-app
- [ ] Fan account sees and plays the clip in Discover (refresh + pagination)
- [ ] The installed dev client opens and works with no Mac, Metro, or Docker running

## Phase C — pre-launch / when relevant

### C1. Universal Links / App Links (OAuth hijack fix)

The `cue://` custom scheme can be registered by other apps. Production should use domain-verified
links for the OAuth callback. The domain exists after A12:

- [ ] Host an `apple-app-site-association` (AASA) file at `https://cuethecomedy.com/.well-known/`
- [ ] Add `"associatedDomains": ["applinks:cuethecomedy.com"]` to `app.json` → ios (code change — ask
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
