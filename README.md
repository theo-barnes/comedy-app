# Comedy App

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

### Terminal 2: rebuild and run the iOS simulator app

Run this second.

```bash
cd /Users/theobarnes/Projects/comedy-app
cp .env.example .env.local
pnpm ios
```

What this does:

- loads Expo public env vars from `.env.local`
- rebuilds the native iOS app
- installs/runs it in the simulator

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
