# Venue Gig Creation

## Status, Scope and Decisions

Status: Implemented with focused automated verification. Native simulator verification is
pending: permission to boot a simulator was declined. User approved a straightforward UI on
2026-10-08; bespoke visual design will follow separately. Venue accounts only; promoters,
drafts, posters, articles and connectors are outside this slice.

Risk: High because the change crosses authenticated event creation and API contracts.
Reuse existing event persistence, venue profiles, rate limits and themed form components.
No schema migration or change to existing event visibility is planned.

The native creation flow uses the signed-in venue's stored address and coordinates. If missing,
provide an explicit venue setup form using the existing creator-profile update API. Never use
the phone's current location as the venue. Expose coordinates additively in creator responses.

Publish immediately as a scheduled event. A new native-event endpoint accepts local start/end
timestamps and an explicit IANA timezone, validates future dates and rejects invalid/ambiguous
daylight-saving times, and derives location server-side. Keep existing `/events` clients intact.
Default the visible, editable timezone to `Europe/London` for the UK pilot, not the device timezone.

Title, date/time and usable venue location are required. Description, end date/time and HTTPS
ticket link are optional. Require an explicit end date when an end time is supplied, including
overnight shows. Venue setup preserves existing profile metadata.

## Delivery

1. Backend: venue lookup port/factory, additive creator coordinates, native-event schema/route,
   local-time conversion and ownership/location validation. Validate event and creator tests.
2. Frontend: typed creator/event clients, query keys/invalidation, venue setup, create form and
   venue-Home entry point. Show explicit loading/error/unconfigured/permission/success states.
3. Tests: input validation, DST/overnight times, venue authorization, missing location, response
   contracts, setup/publish failures, duplicate-submit prevention and fresh venue/Home data.
4. Journey: use available browser/simulator automation; report environment limitations. Preserve
   video upload and Discover and run focused checks before widening validation.

## Acceptance

- Venue users can set up their venue, enter a gig and publish without a provider account.
- Venue identity and event coordinates come from server-authorized venue data.
- Other roles cannot publish through the native flow.
- Future start/end validation and timezone conversion are consistent across device timezones.
- Errors preserve form data; successful publication is explicit and prevents accidental repeats.
- Existing event/video endpoints and existing clients keep their intended behavior.

## Rollout and Rollback

Deploy additive backend endpoints/fields before the client route. Rollback hides the entry point;
retain event records and existing endpoints. No destructive backfill or migration is required.

## Validation and Next Action

Read applicable instructions and Expo SDK 56 docs. Run existing focused pytest/Jest checks,
typecheck, affected lint, governance and formatting. Record exact commands/results here.

Implementation and verification evidence follow. The remaining live journey is recorded
separately from the completed automated checks.

### Implemented

- Protected create-event route and venue Home entry point with real upcoming-event data.
- Venue setup preserving bio/capacity, optional native address geocoding and explicit coordinate
  confirmation/manual entry. Address changes invalidate old coordinates.
- Native publication with explicit timezone, server-owned venue location, date/DST validation,
  optional description/end/booking link, clear success and retained input on failure.
- Creator coordinate response fields, typed API clients and query invalidation after saves/posts.
- Automated component journey verifies publication refreshes the real venue Home query.
- Existing event creation and Discover/video contracts are unchanged. Venue Home shows UTC
  explicitly because the existing event record stores an instant, not its original timezone.

### Validation Completed

- `pnpm validate:governance`: passed.
- `pnpm typecheck`: passed.
- Targeted existing ESLint on changed TypeScript/React Native files: passed.
- Targeted Jest on the five new/changed event, API and venue Home suites: 39 tests passed.
- Expanded Jest selectors including fan Home, Discover and upload: 8 suites / 51 tests passed
  at that checkpoint; upload tests emitted existing `act(...)` warnings and the in-band process
  stayed open after results, so it was stopped. New event suites exit cleanly.
- Backend fake-based tests for native events, existing events, creators, feed, auth and rate
  limiting: 114 passed.
- Expo native dev server started and responded with HTTP 200; new route types generated.
  The server was stopped after checks.
- Web preview unavailable: existing checkout lacks `react-dom` and `react-native-web`. No
  unrelated web dependencies were added. Simulator boot was not retried after permission denial.

### Remaining Verification and Exact Next Action

Deploy the additive native-event endpoint and creator fields before the new client. Exercise
venue setup and creation on an authorized device/simulator against the configured backend,
including permission denial/geocoding, publication and nearby Home discovery. Do not mark that
live journey verified based on mocked component tests.
