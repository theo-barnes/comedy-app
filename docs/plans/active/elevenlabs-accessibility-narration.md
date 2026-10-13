# ElevenLabs Accessibility Narration Execution Plan

Status: in progress, 2026-10-13. Risk: high. Decision:
[ElevenLabs accessibility narration](../../decisions/2026-10-13-elevenlabs-accessibility-narration.md).

## Scope

- Backend-only ElevenLabs Text-to-Speech integration.
- On-demand MP3 narration for published, scheduled events and public creator profiles.
- No arbitrary client text, stored audio, voice cloning, recording, or agent session in this change.
- Optional accessible mobile playback for eligible event summaries.

## Architecture

1. `accessibility` owns the speech-provider port, summary construction, visibility checks and
   provider error translation.
2. Its factory adapts event and creator repositories through narrow lookups and selects an explicit
   unavailable provider until configured.
3. The controller exposes one authenticated, rate-limited binary endpoint. It never returns an
   upstream URL, provider key, transcript, or provider response body.
4. The mobile API helper sends the normal Supabase token to the internal endpoint and validates the
   MP3 response before its feature-owned accessible control plays it.

## Acceptance

- Only the two fixed resource types are accepted.
- A draft, cancelled or missing event cannot consume synthesis credits.
- The mobile client cannot choose source text, voice, model, or call ElevenLabs directly.
- Audio responses use `audio/mpeg` and `Cache-Control: no-store`; neither audio nor narration text
  is persisted or logged.
- Missing configuration, rate limiting, and upstream failures are clear, non-success errors.
- Event and profile text remains usable when narration is disabled or fails.

## Rollout and rollback

Provision a scoped ElevenLabs key in the backend secret manager, select a licensed platform voice,
and retain `DISCOVERY_ELEVENLABS_ENABLED=false` through automated tests. Enable in non-production,
test device playback and inspect provider request/cost identifiers and failure rates. Enable
production only after that evidence. Disable the flag or remove the key to roll back immediately.

## Validation

- `cd backend && DISCOVERY_DATABASE_URL='' DISCOVERY_REDIS_URL='' .venv/bin/python -m pytest
tests/test_accessibility.py -q`: 9 passed on 2026-10-13.
- `cd backend && DISCOVERY_DATABASE_URL='' DISCOVERY_REDIS_URL='' .venv/bin/python -m pytest
tests/ -q`: 337 passed, 13 skipped on 2026-10-13.
- `cd backend && .venv/bin/python -m compileall -q src/accessibility src/shared/config.py
src/main.py`: passed on 2026-10-13.
- `corepack pnpm test:focused --runTestsByPath __tests__/lib/api/client.test.ts
__tests__/features/accessibility/NarrationButton.test.tsx --silent`: 30 passed on 2026-10-13.
- `corepack pnpm test:ci`: 93 suites and 498 tests passed on 2026-10-13.
- `corepack pnpm typecheck`, `corepack pnpm lint`, and `corepack pnpm validate:governance`: passed
  on 2026-10-13.
- Pending: a development-build playback journey with non-production credentials, selected
  platform voice, and device access.

## Exact next action

Create the backend accessibility domain with fake-provider tests and mount its authenticated route.
