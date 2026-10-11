# Required Image for Gig Publication

- Status: Accepted for the venue-only correction on 2026-10-11.
- Risk: High: publication, schema, private preparations, media and existing visibility.
- Execution: [Required gig images](../plans/active/required-gig-images.md).

## Context

The first venue creation implementation immediately scheduled gigs. The subsequent managed
poster implementation made artwork optional and attached it after publication. Those contracts
do not meet the clarified product requirement: every publicly posted gig must include a photo.
Enabling its optional-poster capability or adding client-only validation cannot correct this.

## Decision

Require one primary managed image for publication. Retain Supabase private originals and public
processed display images. A venue can prepare a private draft to bind an upload; the form requires
image selection before submission. Public success occurs only after validation and finalization.

Model publication separately from scheduled/cancelled event status. Commit publication and the
validated image reference together, using the existing transaction-bound event/image port and
revision checks. Reuse bounded image processing, immutable objects, signed TUS, and durable
idempotency. Do not expose drafts through details, public lists, Home, or linked-event hydration.

Preserve existing image-less event records as private drafts, accessible only to their owners for
completion. Do not fabricate artwork, delete their data, or automatically change their dates.
Reject sole-image removal on published gigs; replacement retains the prior image until commit.
Cancellation remains a separate schedule state.

Remove the optional `DISCOVERY_GIG_POSTERS_ENABLED` product switch. Missing media configuration
or provider failures stop publication explicitly, not fall back to image-less publication. Keep
destructive cleanup dry-run independently controlled. Reads remain available during Storage
outages; the configured database schema must still pass the existing readiness guard.

## Alternatives

- Required picker only: rejected; direct clients and failed attachment would still publish.
- Upload-first unbound assets: not selected; owner-only event preparation reuses event-bound assets.
- Optional images behind a default-on flag: rejected; it preserves an invalid product fallback.
- Galleries: deferred; one primary image satisfies this bounded correction.

## Consequences and Rollout

The client must distinguish preparation from publication and recover the same draft after a lost
response. Legacy publication routes cannot remain a bypass. Existing owner journals/submission
IDs must be reconciled, not silently discarded or duplicated.

SQL and Storage are not a distributed transaction. A prepared public object may remain orphaned
after SQL failure; durable publication leases and reference-safe cleanup reconcile it without
exposing a public draft.

Use a new additive migration, coordinated event-write pause and draining of incompatible backend
readers, then migrate, deploy visibility-aware code, invalidate event/feed caches, and release the
compatible client. Rollback must not restore old readers that expose scheduled drafts. Preserve
schema/data and use a compatible forward fix or a safe publication pause.

## Verification

Prove the required-image invariant in service and database tests, all public read surfaces, native
and legacy publication attempts, sole-image removal, and interrupted/replayed finalization.
Exercise actual Supabase isolation and signed TUS on devices before claiming live acceptance.
Automated tests and bundle exports do not imply Storage provisioning or visual approval.
