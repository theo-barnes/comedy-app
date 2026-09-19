# Next Steps

## Verified local run path: San Francisco neighbourhood chips

If the goal is specifically to see San Francisco neighbourhood chips in the simulator, use the commands in [README.md](../README.md).

Key details:

- backend must run against the unified platform DB on `54329`
- frontend must point to `http://127.0.0.1:8000`
- backend must set `DISCOVERY_MIN_INVENTORY_FOR_NEIGHBOURHOODS=0` for local/demo behavior so mid-sized cities return neighbourhood clusters immediately

A prioritised roadmap for advancing this codebase from a polished prototype to a production-ready product. Items within each phase are ordered by impact.

## Phase 1 — Harden what exists

### Security

- **Apply the versioned Supabase migrations** (`supabase/migrations/`) to the hosted project — includes the role-escalation fix that locks `profiles.role` after creation and the `updated_at` trigger. Verification steps live in [docs/OPERATOR-TASKS.md](OPERATOR-TASKS.md).
- **Replace the `cue://` custom URI scheme with Universal Links (iOS) / App Links (Android)** for the OAuth callback so third-party apps cannot hijack the redirect.
- **Enforce the password policy server-side** in the Supabase dashboard (minimum length matching the client-side Zod rule) and enable auth rate limiting.
- **Split environments**: create a dedicated production Supabase project; keep dev/staging keys out of production builds.

### Delivery pipeline

- Extend CI (`.github/workflows/ci.yml`) to run the backend suite (`pytest`) and `pnpm test` alongside lint/typecheck, and require green checks via branch protection on `main`.
- Add EAS Update channels (`staging`, `production`) and switch the runtime-version policy to `fingerprint` so OTA updates can never reach incompatible native builds.
- Add a Maestro E2E smoke flow (sign-in happy path) to catch integration regressions the unit suites cannot.

### Quality

- Fix the pre-existing lint failures (import-type annotations in `__tests__/i18n` and `__tests__/lib`).
- Add coverage thresholds to Jest and pytest so coverage cannot silently regress.

## Phase 2 — Replace fixtures with live data

The UI currently renders fixture content (`*-home-fixture.ts`, `features/browse/config.ts`, `features/discover/config.ts`) behind the same view models the API will populate. Wiring order:

1. **Fan home** — the plumbing already exists (`useHomeFeed` + `selectFanHomeSections` falls back per-section). Populate the backend `feed` module's inventory from real content tables and delete the fixture fallback once the feed is reliable.
2. **Browse/discover** — replace `getBrowseConfig`/`getDiscoverConfig` static data with queries against the events/content services; keep the config shape as the API contract (it already models exactly what the screens need).
3. **Comedian & venue dashboards** — the analytics and events backend modules exist; add view-model selectors mirroring `fan-home-selectors.ts` and connect them.
4. **Replace `StubInventoryProvider`** in the location service once content tables carry real events, so discovery scopes return live counts.

## Phase 3 — Product completion

- **Media pipeline**: swap `StubMediaProvider` for Cloudflare Stream in production; add client-side upload flows for comedian clips (the backend `media` module and worker scaffolding already exist).
- **Ticketing/attendance**: model ticket links or an in-app checkout; the `events` module currently stores `ticketUrl` only.
- **Push notifications**: Expo Notifications for gig reminders and follower activity, driven by the existing `engagement` module.
- **Search**: unify the discover search UI with a backend search endpoint (Postgres FTS is sufficient at current scale).
- **Google/Instagram OAuth**: finish provider setup (Google Cloud credentials, Supabase provider config, SHA-1 fingerprints for Android release builds).

## Phase 4 — Scale and operate

- **Observability**: Sentry is integrated on both sides; add alerting rules, structured logging in FastAPI, and dashboards for the worker jobs (rollup/trending).
- **Performance**: adopt the H3-based `discovery_cache` as the primary read path for discovery once traffic warrants it; profile list rendering with real data volumes (FlashList if needed).
- **Android parity**: full test pass on Android (deep links, SecureStore, native tabs fallback is already in place).
- **Theme expansion**: the app is intentionally dark-only; add new palettes only when their full component and native-navigation states are designed and regression-tested.
- **Infrastructure as code**: containerise the FastAPI service for deployment (Dockerfile exists); add a deployment workflow and database migration step to CI.

## Architectural principles to preserve

- **Feature modules own their UI and data mapping** (`src/features/*`); routes in `app/` stay thin.
- **All API responses are Zod-validated at the boundary** (`src/lib/api/*`) — keep this when adding endpoints.
- **Backend modules follow one pattern** (domain models → repository protocol → service → schemas → controller → factory with graceful fallback). New domains should copy it.
- **Fixtures are typed and co-located** with the screens they support, making the remaining integration work explicit and searchable (`*-fixture.ts`).
