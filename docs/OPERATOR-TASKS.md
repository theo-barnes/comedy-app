# Operator Tasks — actions required outside the codebase

Tasks only you can complete (dashboards, accounts, local machine). Ordered by priority.
Tick items off as you go; this file is the single source of truth for out-of-repo work.

## P0 — Security critical (do before anything else)

### 1. Apply the database migrations to your Supabase project

The repo now versions the schema under `supabase/migrations/` (baseline + role-escalation fix).
The Supabase CLI is installed as a dev dependency (`pnpm supabase ...`).

```sh
pnpm supabase login
pnpm supabase link --project-ref kwezyzbqbmkcagmglspk
pnpm supabase db push
```

The migrations are idempotent (`if not exists` / `drop ... if exists` guards) so they apply
cleanly onto your existing dashboard-managed schema.

**Verify the escalation fix worked** — in the SQL editor, impersonating is hard, so instead from
a signed-in fan account in the app/dev console run:

```ts
await supabase.from('profiles').update({ role: 'venue' }).eq('id', session.user.id);
```

Expected: error `role is immutable once set`.

- [ ] `supabase link` + `db push` completed
- [ ] Escalation test rejected

### 2. Confirm RLS is enabled on every table

Dashboard → Database → Tables: every table in `public` must show RLS **enabled**.
The migrations enforce it for `profiles`; check anything created manually.

- [ ] All tables show RLS enabled

### 3. Supabase Auth dashboard hardening

Dashboard → Authentication:

- [ ] **Password policy**: minimum 8 characters + require letters/digits mix
      (Settings → Auth → Passwords) — matches the client-side Zod rule
- [ ] **Leaked password protection**: enable (checks against HaveIBeenPwned)
- [ ] **Redirect URLs**: allowlist exactly `cue://auth-callback` (remove
      `comedy-app://auth-callback` and any wildcard entries)
- [ ] **Rate limits**: review Auth rate limits (tighten if on a paid plan)

### 4. Secret hygiene

Git history was checked on 2026-06-10: no `.env` / `.env.local` ever committed, and the working
tree only tracks `.env.example`. No rotation needed unless you've shared keys elsewhere.

- [ ] Confirm the anon key hasn't been pasted into chats/docs/screenshots; rotate in
      Dashboard → Settings → API if unsure

## P1 — Before production release

### 5. Asymmetric JWT signing keys (Python backend preparation)

Dashboard → Settings → Auth → JWT Keys → migrate to **asymmetric (ECC/RSA) signing keys**.
This lets a future Python/FastAPI service verify user JWTs via the project's JWKS endpoint
without sharing the legacy HS256 secret. Cheap now, painful after launch.

- [ ] Migrated to asymmetric signing keys

### 6. Universal Links / App Links (OAuth hijack fix)

The `cue://` custom scheme can be registered by other apps. Production should use domain-verified
links for the OAuth callback:

- [ ] Acquire/decide the app's domain (e.g. `cue.app`)
- [ ] Host an `apple-app-site-association` (AASA) file at `https://<domain>/.well-known/`
- [ ] Add `"associatedDomains": ["applinks:<domain>"]` to `app.json` → ios (code change — ask
      for it once the domain exists)
- [ ] Android: host `assetlinks.json` and add the intent filter (paired code change)
- [ ] Update Supabase redirect allowlist to the https URL

### 7. Local development database (for verifying migrations + RLS tests)

No container runtime is installed on this machine, so `supabase start` can't run yet:

- [ ] Install OrbStack (recommended on macOS: `brew install orbstack`) or Docker Desktop
- [ ] Then: `pnpm supabase start` + `pnpm supabase db reset` to run all migrations locally

Note: Homebrew itself is currently blocked — macOS Command Line Tools are outdated.
Run `xcode-select --install` (or install CLT for Xcode 26.3 from
https://developer.apple.com/download/all/) first.

- [ ] Update Xcode Command Line Tools

### 8. Sentry (Phase 4 is now in code — finish these to activate it)

- [ ] Create an org/project at sentry.io (React Native platform)
- [ ] In `app.json`, replace `REPLACE_WITH_SENTRY_ORG` and
      `REPLACE_WITH_SENTRY_PROJECT` (under the `@sentry/react-native/expo`
      plugin) with your real org slug and project name
- [ ] Put the DSN in `.env.local` as `EXPO_PUBLIC_SENTRY_DSN`
      (Sentry is a no-op until this is set, and disabled in dev builds)
- [ ] Add `EXPO_PUBLIC_SENTRY_DSN` to EAS → Project → Environment variables
- [ ] Create an Organization Auth Token (Sentry → Developer Settings → Auth
      Tokens) and add it as `SENTRY_AUTH_TOKEN` with **sensitive** visibility
      in EAS → Project → Environment variables (for source-map upload)
- [ ] After your first `eas update`, upload source maps:
      `npx sentry-expo-upload-sourcemaps dist`

### 9. EAS environment variables

- [ ] Move production env values into EAS env vars per build profile
      (EAS dashboard → Environment variables), keep `.env.local` for local dev only
- [ ] Confirm the iOS build image uses Xcode 26+ (required for Liquid Glass compilation)

## P2 — Pre-launch / when relevant

### 10. Google OAuth (blocks the "Continue with Google" button)

- [ ] Google Cloud project + OAuth credentials (iOS & Android types)
- [ ] Redirect URI: `cue://auth-callback` (later: the Universal Link URL)
- [ ] Enable Google provider in Supabase Dashboard with Client ID/Secret
- [ ] `EXPO_PUBLIC_GOOGLE_CLIENT_ID` in `.env.local`
- [ ] Release builds: register Android SHA-1 fingerprint

### 11. Apple Developer

- [ ] Enroll in the Apple Developer Program (needed for device builds, TestFlight,
      Associated Domains)
- [ ] Register devices: `npx eas-cli device:create`

### 12. Separate production Supabase project

- [ ] Before launch, create a dedicated production project; apply the same migrations via
      `supabase db push`; keep the current project as staging

### 13. GitHub repo protection

- [ ] Protect `main`: require PR + passing status checks (Settings → Branches)

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
