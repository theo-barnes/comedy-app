# Native Home Content Execution Plan

## Status and Scope

Status: Broad content design remains proposed. An initial venue-only gig creation slice was
approved on 2026-10-08 and is tracked in [Venue gig creation](venue-gig-creation.md); the user
subsequently reported it working well. [Gig posters](gig-posters.md) is the next planning slice:
Supabase Storage, private originals, public processed display artwork and provisional UI have
been selected. No poster runtime work is implemented yet. Promoter support, drafts, standalone
promotional posts and articles remain deferred; bounded slice approval does not accept them.

The [proposed ADR](../../decisions/2026-10-07-native-home-content.md) covers in-app creation and
Home presentation of events, photos/posters/promotional material and articles. Preserve working
video upload and Discover playback. External accounts, data imports, website synchronization
and connector tooling are excluded and are not dependencies of any phase.

Affected owners: events, content, image media, feed, profile attribution and native frontend
creation/Home features. Risk is high when implementation begins because of publishing,
authorization, schema and media boundaries. This plan is not permission to change them yet.

## Completed Planning

- [x] Establish native authoring as the normal creation workflow.
- [x] Identify reusable content metadata, feed hydration, API/query and Home-card primitives.
- [x] Keep event artwork separate from intentionally published promotional posts.
- [x] Preserve event versus content-engagement identity and the video-only Discover contract.
- [x] Record product decisions and rollout/rollback requirements in a proposed ADR.

## Decisions and Blockers

Before accepting the ADR, resolve its permission/ownership matrix, author display-name versus
username contract, draft/editing semantics, image scope/storage/limits, article body format,
Home sections and event cancellation/bookmarking behavior.

Native promoter event creation needs a narrowly scoped ownership/location design because current
events belong to venue user accounts. Do not mislabel a promoter account as a physical venue,
or assume selecting a location grants management permission.

## Planned Slices

### 1. Approve native contracts and publication rules

- Specify create/edit/preview/publish/withdraw behavior and permission checks for each kind.
- Choose image and article schemas and kind-specific Home read models.
- Define compatibility/backfill for current content and events; preserve old client responses.
- Approve the ADR and record the selected product decisions before writing migrations.

Acceptance: reviewed examples cover every kind, unauthorized actions, draft visibility and
existing-client compatibility. No external account is needed.

### 2. Native events and managed artwork

- Extend events only with approved native fields, publication state and poster references.
- Establish managed image upload validation, ownership, readiness/retry and cleanup.
- Build the native event composer/preview/detail journey and wire real artwork into gig cards.
- Support native promoter ownership as decided in slice 1; retain physical venue identity.

Acceptance: a user creates and edits a gig with a poster; drafts stay private; failed uploads
cannot publish; cancellation changes upcoming eligibility; old events retain intended visibility.

### 3. Native photo and promotional posts

- Build image selection/upload, title/description, author attribution and detail presentation.
- Allow optional authorized event links without copying event logistics.
- Publish promotional artwork only on explicit request; wire dedicated Home cards and navigation.
- Reuse content likes/saves where approved and invalidate affected Home/detail queries.

Acceptance: a post displays the uploaded image and correct author/title/description; unauthorized
links/edits fail; withdrawal propagates; repeated actions do not create unintended duplicate posts.

### 4. Native articles

- Add an explicit article payload using the approved body format and validation limits.
- Build composition, preview, publication/editing and full-reader behavior with optional cover.
- Return excerpts to Home and load full bodies only for article details.

Acceptance: authors can compose and edit articles; Home previews navigate to accessible, safely
rendered bodies; malformed content fails explicitly; drafts/withdrawn articles are not recommended.

### 5. Home and regression verification

- Integrate approved section placement and content-appropriate eligibility/ranking.
- Cover loading/error/empty/offline states, attribution, removed content and navigation.
- Verify events are not sent to content-engagement endpoints and non-video posts are not returned
  by the Discover video endpoint.
- Run native creation-to-Home journeys and existing video upload/playback regressions.

Acceptance: all approved content kinds work end to end without providers/imports; current
Discover and existing-client behavior remain intact.

## Validation Strategy

After each substantive edit, run the smallest relevant existing check:

- Backend: focused fake-based pytest service/repository/schema tests for publishing,
  ownership, media and feed projections.
- Frontend: focused Jest/React Native Testing Library composer, selector, card and reader tests,
  plus affected lint and type checks.
- Contracts/migrations: producer/consumer and authorization tests, with explicit backfill and
  rollback verification.
- UI/media: simulator/device or available automation journeys for each approved native slice.
- Documentation: `pnpm validate:governance` and targeted existing Prettier checks.

Read applicable path instructions and exact Expo SDK 56 documentation before implementation.
Record actual commands/results per slice; none of the proposed behavior has been tested yet.

Planning-document checks on 2026-10-07:

- `pnpm validate:governance`: passed (8 governance files, 4 scoped instructions).
- Targeted `pnpm exec prettier --check` for this plan and the two new ADR documents: passed.
- `git diff --check`: passed; reviewed the documents for workstream separation.

## Rollout and Rollback

Use additive migrations and deploy compatible backend readers before exposing new composers or
Home sections. Gate each new kind independently. Preserve stored user records/assets when
disabling a surface; keep read support for published data and existing event/video clients.

## Documentation and Next Action

Update the owning API/backend/media documentation when accepted behavior is implemented, not
as if this proposal were already shipped. Keep this plan active across sessions and move it to
completed only after the approved native journeys and regressions are verified.

Exact next action: finalize the [gig-poster plan](gig-posters.md)'s input/HEIC/retention defaults
and additive image/attachment contracts for venue-owned gigs. Maintain the
[UI view register](../../ui-view-register.md) and complete relevant
[operator prerequisites](../../OPERATOR-TASKS.md) during implementation. Resolve broader ADR
decisions when their own slice begins; promoter ownership is not a prerequisite for venue
posters. No connector research or external-provider approval is required.
