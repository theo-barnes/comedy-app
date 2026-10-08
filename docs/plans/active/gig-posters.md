# Native Gig Posters Execution Plan

## Status, Scope and Risk

Status: planning only, 2026-10-08. No image schema, runtime UI, storage resources or policies
have been implemented/provisioned by this change.

The user selected **Supabase Storage**, with **private originals** and **public processed display
posters for published gigs**, and authorized provisional UI. This is the next bounded slice of
[native Home content](native-home-content.md), following working venue gig creation.

Scope: venue accounts can optionally add one poster while creating a gig, and add/replace/remove
the poster of an existing owned gig. Display real artwork in existing Home gig presentations.
Preserve poster-free gigs and existing Discover uploads/playback.

Excluded: promoters, imports/connectors, standalone promotional posts, galleries, articles,
general gig editing, drafts, new ranking/engagement behavior and a new public gig-detail page.
Attaching a poster does not publish a second promotional content item.

Implementation risk: **high** (media, authorization, storage, schema/API and deletion boundaries).
This execution plan satisfies the pre-implementation planning gate, not the live-verification
gate. Record final contracts and rollout evidence before shipping.

## Owners, Reuse and Boundaries

- Events owns attachment authorization and the single active poster reference. The signed-in
  venue must own the event; a client-supplied venue ID or URL conveys no authority.
- A narrow image-media boundary owns upload intents, validation, processing, storage and cleanup.
  Introduce an image-asset record rather than forcing event posters into video-oriented
  `content.media_assets`. Review its placement against the backend module map before migration.
- Use Protocol ports and factory adapters between events and images, with services enforcing
  rules and thin controllers. Alembic owns platform image/event tables; versioned Supabase
  migrations own Storage policy/bucket configuration.
- Reuse authenticated API calls, Zod, React Query/query keys, Home selectors,
  [EventCard](../../../src/features/home/components/EventCard.tsx), theme/form primitives and
  installed `tus-js-client`. Keep routes thin and feature-owned.
- The [video TUS helper](../../../src/features/upload/tus-upload.ts) is Cloudflare-specific
  and uses 10 MiB chunks. It cannot be reused unchanged: Supabase currently requires 6 MiB
  chunks, its own endpoint/metadata and signed-upload headers. Prefer a small provider-specific
  adapter; extract only stable transport control when tests demonstrate actual reuse.
- Do not extend the Discover video endpoint or use content likes/saves with event IDs.

## Selected Decisions and Proposed Defaults

Selected: Supabase; originals private; processed posters public only for published gigs; one
optional poster per owned gig; provisional UI recorded in the [UI register](../../ui-view-register.md).
The existing immediate-publication gig lifecycle is retained; this slice does not add drafts.

Recommended defaults to finalize before implementation:

| Concern       | Recommendation                                                                                                                     | Decision/verification still needed                                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Input         | JPEG, PNG and WebP; at most 10 MiB                                                                                                 | Server checks actual bytes/format/size; confirm Supabase project upload quota. Reject SVG, animation and unsupported types explicitly. |
| HEIC/HEIF     | Support conversion only if a verified Expo SDK 56 path produces a supported upload; otherwise give an actionable format error      | Test real iOS assets; do not claim HEIC support from file extension or picker MIME alone.                                              |
| Decode/output | Bounded decode, initially at most 25 megapixels; preserve aspect ratio; one display rendition with a proposed 2048-pixel long edge | Benchmark memory/CPU and poster-text legibility; finalize JPEG/PNG output and quality against real posters.                            |
| Privacy       | Re-encode display pixels without EXIF/GPS or embedded metadata; never publish originals                                            | Verify orientation, color and transparency behavior and metadata absence in output.                                                    |
| Retention     | Retain originals while attached; propose a 24-hour grace for abandoned and superseded assets                                       | Confirm policy and cleanup schedule; wait beyond signed-upload expiry and exclude active/in-flight references.                         |
| Delivery      | Immutable, server-generated public paths; no overwrite/upsert; deliberate browser cache TTL                                        | Finalize bucket names, TTL, limits and configuration in versioned implementation. Public copies cannot be instantly recalled.          |

These defaults are recommendations, not claims that processing or operational limits are tested.
Ask the user before materially changing the selected privacy model or retention expectations.

## Lifecycle and Publication

### Upload and processing

1. Backend verifies venue ownership of an existing, publicly published gig and creates an
   owner/event/purpose-bound upload intent with an unpredictable object key and expiry.
2. Backend issues a path-scoped signed upload capability into private Storage. Mobile receives
   only that capability, never a service-role/secret key. Do not permit public original reads,
   arbitrary bucket/path selection or general output writes from the app.
3. Mobile uploads with the Supabase TUS adapter and reports progress/cancellation. An upload
   success alone does not make the asset ready.
4. An authenticated completion endpoint verifies the stored object, actual size and decoded
   format/dimensions, rejects malicious/malformed input, and generates a metadata-free display
   rendition privately. Repeated completion is idempotent; ownership is checked on every action.
5. Only server-validated, immutable bytes become a ready private asset. Prevent a still-valid
   upload token from changing bytes after validation; prohibit overwrites and seal/move the
   upload into a backend-only private location if necessary.

Use explicit states such as uploading, processing, ready-private, attached and failed, with
actionable owner-visible failures. Processing must be bounded and retryable. Choose synchronous
bounded processing versus a durable worker using measured limits; do not rely on ephemeral
FastAPI background tasks or a mobile callback for durable work.

### Attach, replace and remove

- Attaching verifies the asset's owner, purpose, target event and readiness. Publish a new
  immutable processed object only after verifying the target gig is public and owned.
- Serialize/CAS attachment changes with a revision or equivalent expected-current value.
  Promote the new display reference only after the public copy is verified. Keep the old poster
  visible until replacement succeeds; stale concurrent operations must not win or delete the
  current asset. Repeating a successful attachment returns the same result.
- Database and Storage writes are not one atomic transaction. Record operation state, compensate
  failed publication, and reconcile orphan objects after crashes. No untracked public output;
  do not claim instantaneous cross-service deletion/revocation.
- Removal updates the event reference first and retains the old image if the database update
  fails. Confirm destructive intent in UI. Cleanup deletes only genuinely unreferenced objects
  after the agreed grace and handles retries without deleting a later replacement.
- Cancellation is not withdrawal: keep artwork on existing publicly visible cancelled gig
  records, while preserving their exclusion from upcoming recommendations. Actual event/account
  deletion or a takedown needs reference cleanup and public-object deletion, subject to caches.

### New gig creation: explicit two-step success

Prefer the smallest honest flow over pretending event creation and Storage are atomic:

1. Select and preview an optional local poster; perform preliminary checks without trusting them
   as backend validation.
2. Publish the gig using the native endpoint. Add backward-compatible idempotency-key handling
   for this journey so an ambiguous network result can be reconciled without creating another gig.
   Scope keys to the user/logical submission, reject mismatched payload reuse and return the
   original result on replay. Preserve old clients without the new header.
3. Retain the created event ID, then upload/process/attach its poster. Once the gig exists,
   retries target that event, never repeat event creation. Preserve ambiguous-submission identity
   across navigation/restart using the repository's established persistence patterns.
4. If the poster fails, say **"Gig published; poster not attached"**, retain a management/retry
   path, and refresh the venue list. Never present a generic failed-publication screen that
   encourages duplicate gigs. A poster failure must not remove a successfully published gig.

This means a new gig can briefly appear without artwork. It is an intentional, documented
consequence of posters being optional, not a silent success-shaped fallback.

## Contracts and Provisional UI

- Add nullable poster display data to event and applicable Home event projections. Select final
  fields before coding (URL plus dimensions/aspect ratio if needed); no private Storage keys or
  signed original URLs in public schemas. Older events remain valid without backfill artwork.
- Keep upload/processing status in owner-management responses, not the public feed. Backend
  generates trusted poster URLs from managed assets; do not accept arbitrary client image URLs.
- Add narrow intent/completion/attachment/removal endpoints with ownership, write-rate limits,
  idempotency and concurrency checks. Record exact paths/error contracts before implementation.
- Wire every relevant consumer: event responses, own-gig listing, Home sections/nearby event
  projections, Zod schemas, selectors, cards and mutation invalidation. Audit any linked-event
  projection instead of assuming it already shares the event response model.
- Compose: optional image picker, aspect-ratio-safe preview, clear limits, remove selection,
  progress, cancel and explicit two-step outcome.
- Manage: a poster-only page reached from venue-owned gigs; add/replace/remove controls, current
  poster visible through replacement failure, conflicts/retry and no general gig editing.
- Display: existing Home gig cards/list items gain artwork with a no-poster/broken-image fallback.
  Do not force a crop that hides poster information; check text legibility and accessibility.
- Update `gig-poster-compose`, `gig-poster-manage`, `gig-poster-display` and affected existing
  entries in the UI register in every implementation change. Screenshot-based refinement follows
  separately; other UI work still needs its own approval.

## Incremental Implementation and Acceptance

1. **Contract/security foundation:** read matching backend/contracts/frontend instructions and
   exact Expo v56 docs; finalize defaults and module placement; define additive migrations,
   scoped Storage capabilities/policies and event-creation idempotency. Test producer/consumer
   compatibility, ownership and replay before adding upload UI.
2. **Image lifecycle:** implement the provider adapter, private validation/re-encoding, publication,
   CAS attachment/removal and cleanup/reconciliation. Prove wrong-owner/target/purpose rejection,
   overwrite protection, malformed/oversized/decompression input limits and metadata stripping.
3. **Native journey and Home:** implement provisional compose/manage/display surfaces, preserve
   the successful gig on poster failure, propagate read models and invalidate all affected lists.
   Test picker cancellation/permissions, offline/retry/cancel, restart/ambiguous create recovery,
   replacement/remove failures, conflict and old-event fallbacks.
4. **Staging proof and delivery:** complete operator prerequisites, then use real Storage and
   native devices for create/add/replace/remove, account isolation and public/private URL checks.
   Verify cleanup after interrupted publication, public cache behavior, cancelled gigs and
   working Discover video upload/playback.

After each substantive edit run the smallest existing focused pytest/Jest checks. Run affected
lint/typecheck and migration/authorization checks; widen only as needed. Fake storage tests do
not prove deployed policies or decoding behavior. Document actual commands/results and any
unavailable simulator/device checks; do not mark live acceptance complete without evidence.

## Rollout, Rollback and Operator Work

See [Operator Tasks](../../OPERATOR-TASKS.md), the intentionally Git-ignored local runbook,
for environment-specific task completion. Shared prerequisites below remain versioned here;
all are pending:

- `POSTER-01` / `POSTER-02`: confirm projects, quotas, billing/CDN tier and cost alerts; apply
  reviewed private/public bucket names, flags, allowed MIME settings and file limits.
- `POSTER-03` / `POSTER-04`: apply versioned scoped Storage policies/capabilities; verify deployed
  anonymous/wrong-owner/expired-token/overwrite rejection; provision and rotate backend-only
  credentials without secrets or signed tokens in mobile bundles, source or logs.
- `POSTER-05` / `POSTER-07`: prove the signed TUS path on iOS/Android, limits and immutable
  validated bytes; verify deployment decoder/encoder, bounded processing, orientation,
  transparency, metadata removal and readable output.
- `POSTER-06` / `POSTER-11`: deploy additive migrations and backend before the app; verify old
  clients, rollback gate and continued gig/video publishing without deleting retained assets.
- `POSTER-08` / `POSTER-09`: approve retention and takedown rules; deploy safe durable
  cleanup/reconciliation and stuck/orphan alerts; verify deletion/cache behavior and dry-run
  exclusions for active/in-flight references before any destructive cleanup.
- `POSTER-10`: record live staging create/add/replace/remove, ownership isolation, private/public
  read checks, Home refresh and no duplicate gigs after upload/network failures.

Implementation must supply exact names/configuration and repeatable commands before operators
provision resources or close tasks. Keep staging and production evidence distinct.

Deploy additive migrations/configuration, storage policy and compatible backend readers first.
Verify staging storage isolation and publication; then enable poster mutations/UI with an
independently disableable configuration gate. Existing gig/video publishing remains available.

Rollback disables new poster writes/UI, not existing events. Preserve compatible reads for
already attached posters and retained user originals; pause destructive cleanup if reconciliation
is uncertain. Do not drop columns/buckets or bulk-delete user assets as an application rollback.
Document explicit takedown deletion separately from rollback.

Documentation to update at implementation: backend module/API architecture, finalized image
lifecycle/configuration, operator runbook, this plan and the UI register. Promote lasting image
architecture decisions into the native-content ADR without accepting unrelated article/promoter
proposals. Move this plan to completed only after its accepted journey is verified.

Exact next action: review the proposed limits/HEIC/retention defaults, then finalize contracts and
module placement before implementing step 1 on a fresh implementation branch. No connector or
ticket-provider work is required.

Planning checks are recorded in the planning pull request. Runtime and deployed Storage
acceptance remain untested.

## Provider References

- [Supabase bucket fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals):
  private reads need authorization; public reads are unrestricted, writes remain controlled.
- [Standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads):
  TUS is recommended above 6 MB and immutable paths avoid overwrite/CDN surprises.
- [Resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads):
  direct Storage hostname, current 6 MiB chunk requirement and signed `x-signature` upload token.
- [Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn):
  plan-dependent CDN behavior; invalidation may take up to 60 seconds and client caches persist.
- [Expo SDK 56](https://docs.expo.dev/versions/v56.0.0/): verify image selection/manipulation APIs
  before implementation rather than copying earlier-SDK examples.
