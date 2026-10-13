# ElevenLabs Accessibility Narration

- Status: Accepted on 2026-10-13.
- Risk: High: paid external provider, user-facing accessibility and protected credentials.
- Execution: [ElevenLabs accessibility narration](../plans/active/elevenlabs-accessibility-narration.md).

## Context

Cue has no speech provider boundary. Users need an optional way to hear public comedy event and
creator information without replacing the existing text-first experience. A mobile integration
that sends arbitrary text directly to a provider would expose paid-generation capability, make
cost control impossible, and risk exposing an ElevenLabs key.

## Decision

Introduce a backend-owned `accessibility` module with a narrow `SpeechSynthesisProvider` port.
Its ElevenLabs implementation uses a backend-only API key and generates MP3 for server-built,
allowlisted summaries of published scheduled events and public creator profiles. The module does
not accept arbitrary mobile-provided text and does not create database rows or persist generated
audio.

The authenticated Cue API returns generated audio with `no-store` cache controls. It enforces a
small per-user request limit, input length cap, configured feature switch, fixed voice/model, and
explicit provider-unavailable and upstream-failure responses. Provider request and character-cost
identifiers may be logged for operations; narration text, API keys, and upstream response bodies
must not be logged.

The Expo client calls only Cue's API with the Supabase session token. Playback is optional and
accessible; failures retain the readable source content and never block the view.

## Alternatives

- Direct client-to-ElevenLabs requests: rejected because API keys and paid usage would be exposed.
- Arbitrary client text: rejected because it creates an open paid-generation endpoint.
- Persist generated audio as media: deferred; it adds storage, invalidation, consent, retention,
  and publication lifecycle obligations without being required for the initial accessibility flow.
- Use ElevenAgents now: deferred. Agents need a separate consent, tool authorization, transcript
  retention, and signed-session design.

## Consequences and rollout

Set `DISCOVERY_ELEVENLABS_ENABLED=false` by default. Production is enabled only after a
non-production playback test, cost/error telemetry review, and a licensed platform voice/model
are configured through the secret manager. The API key is backend-only and must never use an
`EXPO_PUBLIC_` variable.

Rollback is setting `DISCOVERY_ELEVENLABS_ENABLED=false` or removing the API key, which returns
an explicit unavailable response without affecting event/profile reads. No migration, stored audio,
or destructive rollback is involved.

Future ElevenAgents work must mint signed URLs in the backend after Cue authentication; signed
URLs are short-lived and are never embedded in app configuration. Agent tools must invoke narrow,
Cue-owned authorization-checked operations.

## Verification

Use fake providers to prove non-public resources and arbitrary text cannot synthesize speech,
allowed resources generate transient MP3, and configuration/upstream failures are explicit.
Exercise playback in a development build with a non-production key before enabling production.
