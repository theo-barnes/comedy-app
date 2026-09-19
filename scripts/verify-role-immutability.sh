#!/usr/bin/env sh
# Verifies the profiles.role immutability trigger (see
# supabase/migrations/20260610000200_security_hardening.sql). Creates a
# throwaway account, sets its role once, then confirms a second role change
# is rejected. Safe to re-run; each run uses a fresh random email.
set -eu

cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  # shellcheck disable=SC1091
  . ./.env.local
fi

SUPABASE_URL="${SUPABASE_URL:-${EXPO_PUBLIC_SUPABASE_URL:-}}"
ANON_KEY="${ANON_KEY:-${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}}"

if [ -z "$SUPABASE_URL" ] || [ -z "$ANON_KEY" ]; then
  echo "Set SUPABASE_URL and ANON_KEY (or fill EXPO_PUBLIC_SUPABASE_URL/ANON_KEY in .env.local)." >&2
  exit 1
fi

EMAIL="escalation-test-$(date +%s)@example.com"
PASSWORD="Test1234!"

echo "== 1. Sign up $EMAIL =="
curl -sS -X POST "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}"
echo

echo "== 2. Sign in =="
TOKEN_RESPONSE=$(curl -sS -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
echo "$TOKEN_RESPONSE"
echo

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')
USER_ID=$(echo "$TOKEN_RESPONSE" | python3 -c 'import json,sys; print(json.load(sys.stdin)["user"]["id"])')

echo "== 3. Set role to fan (must succeed) =="
curl -sS -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"role":"fan"}'
echo

echo "== 4. Attempt escalation to venue (must fail with 'role is immutable once set') =="
curl -sS -X PATCH "$SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID" \
  -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"venue"}'
echo
