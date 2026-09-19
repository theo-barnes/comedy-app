# Comedy App

## Development environments

- **Hosted dev (default for the physical iPhone)** — deployed dev API + worker, the Supabase
  dev project, and Cloudflare Stream. Setup is sequenced phase-by-phase in
  [docs/OPERATOR-TASKS.md](docs/OPERATOR-TASKS.md) (Phase A is free; Phase B is funded).
- **Local backend-debug** — the flow below; use it when changing backend code.

### Local one-command backend

```bash
backend/scripts/dev.sh            # infra + migrations + API on 0.0.0.0:8000
backend/scripts/dev.sh --worker   # also runs the platform worker
```

A physical iPhone on the same Wi-Fi can then use `http://<mac-lan-ip>:8000` as
`EXPO_PUBLIC_API_URL`. Real video uploads still require Cloudflare credentials and a public
HTTPS webhook (hosted dev covers this); the local stub provider cannot accept a binary upload.

## Run Locally: San Francisco Neighbourhood Chips

These commands use the verified local setup where:

- the frontend points at `http://127.0.0.1:8000`
- the backend uses the unified platform database on `54329`
- `DISCOVERY_MIN_INVENTORY_FOR_NEIGHBOURHOODS=0` forces mid-sized cities like San Francisco to return neighbourhood chips immediately for local/demo use

### Why this setup

- `54329` is the backend's unified local platform database, so the discovery API and the rest of the backend read from the same place.
- San Francisco geography has already been copied into that database.
- The frontend now supports either `EXPO_PUBLIC_API_URL` or `EXPO_PUBLIC_DISCOVERY_API_URL`, and the template sets both to the local backend.

### Terminal 1: infrastructure + backend API

Run this first and leave it running.

```bash
cd /Users/theobarnes/Projects/comedy-app/backend
docker compose up -d db redis
cp .env.example .env
set -a
source .env
set +a
.venv/bin/uvicorn main:app --app-dir src --host 127.0.0.1 --port 8000
```

What this does:

- starts Postgres/PostGIS and Redis
- loads the backend env pointing to `postgresql://platform:platform@127.0.0.1:54329/platform`
- enables neighbourhood chips for San Francisco by setting `DISCOVERY_MIN_INVENTORY_FOR_NEIGHBOURHOODS=0`
- serves the API on `127.0.0.1:8000`

Apply backend-owned migrations before starting the API:

```bash
cd /Users/theobarnes/Projects/comedy-app/backend
set -a && source .env && set +a
.venv/bin/alembic upgrade head
```

For real video uploads, configure the three `DISCOVERY_CLOUDFLARE_*` values documented in
`docs/OPERATOR-TASKS.md`. If they are blank, local development uses the stub media provider and
does not transfer or process a real video. Run the reconciliation/analytics worker separately:

```bash
cd /Users/theobarnes/Projects/comedy-app/backend
set -a && source .env && set +a
.venv/bin/platform-worker
```

### Terminal 2: rebuild and run the iOS simulator app

Run this second.

```bash
cd /Users/theobarnes/Projects/comedy-app
cp .env.example .env.local
# Replace the Supabase placeholders in .env.local before continuing.
pnpm ios
```

What this does:

- loads Expo public env vars from `.env.local`
- rebuilds the native iOS app
- installs/runs it in the simulator

Before running `pnpm ios`, open Supabase Dashboard → Project Settings → API and copy the linked
project's URL and client-safe anon/publishable key into `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY`. Never use the service-role or secret key in the Expo client.
The committed `.env.example` values are intentionally non-working placeholders.

Expo inlines `EXPO_PUBLIC_*` values into the client bundle. After changing them, stop and restart
Metro and fully reload the app so the new values are bundled.

### Optional check

Before opening the app UI, you can confirm the backend is returning neighbourhood chips:

```bash
curl "http://127.0.0.1:8000/discovery-regions?lat=37.7749&lng=-122.4194"
```

Expected response characteristics:

- `scopeType` is `neighbourhood_cluster`
- `regions` includes names like `Alamo Square`, `Bernal Heights`, `Civic Center`, `Glen Park`

### If the backend command fails

Use this exact form from the backend directory:

```bash
cd /Users/theobarnes/Projects/comedy-app/backend
.venv/bin/uvicorn main:app --app-dir src --host 127.0.0.1 --port 8000
```

Do not run that command from the repo root unless you also change `--app-dir` to `backend/src`.
