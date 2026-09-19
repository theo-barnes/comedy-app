#!/usr/bin/env sh
# Backend-debug runner: local infra + migrations + API (+ worker with --worker).
# The canonical dev environment is hosted (see docs/OPERATOR-TASKS.md); use this
# when working on backend code itself.
set -eu

cd "$(dirname "$0")/.."

# 0.0.0.0 lets a phone on the same Wi-Fi reach the API via the Mac's LAN IP.
BIND_HOST="${BIND_HOST:-0.0.0.0}"
PORT="${PORT:-8000}"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created backend/.env from .env.example — set DISCOVERY_SUPABASE_URL for authenticated routes."
fi

docker compose up -d db redis

set -a
. ./.env
set +a

.venv/bin/alembic upgrade head

if [ "${1:-}" = "--worker" ]; then
  .venv/bin/platform-worker &
  WORKER_PID=$!
  trap 'kill "$WORKER_PID" 2>/dev/null || true' EXIT INT TERM
fi

exec .venv/bin/uvicorn main:app --app-dir src --host "$BIND_HOST" --port "$PORT"
