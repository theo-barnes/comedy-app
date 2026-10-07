# Native Content Creation and Home Presentation

- Status: Proposed; product and contract decisions below require approval.
- Date: 2026-10-07
- Risk: High for implementation: API/schema, media lifecycle, publishing and authorization.
- Delivery plan: [Native Home content](../plans/active/native-home-content.md).

## Context

Events, photos/posters/promotional material and articles should normally be authored and managed
inside the app. A user must be able to create and publish these without an external account, an
import or a connector. Home presents this native content; Discover remains the established
video-playback experience.

The existing implementation provides useful foundations, not complete support:

- [Content models](../../backend/src/content/models/domain.py) represent video clips, images,
  event promotions and announcements, with ownership, visibility, location and publication state.
- [Content creation](../../backend/src/content/service.py) accepts a pre-existing HTTPS image
  URL and immediately publishes non-video content. That is not a managed photo-upload or
  draft/editor workflow. [Schemas](../../backend/src/content/schemas.py) have no article body.
- [Events](../../backend/src/events/models/domain.py) own schedules, locations, tickets and
  lineups. They have no poster asset or separate publication lifecycle.
- [Event ownership](../../backend/src/events/service.py) currently equates the venue with the
  creating user's account. Native promoter creation across physical venues needs an explicit
  authorization decision; a venue name or selected location must not grant management rights.
- [Feed hydration](../../backend/src/feed/repository.py) provides creator display names, image
  URLs, linked events and content-specific likes/saves. A display name is not a unique username.
- [Home contracts](../../src/lib/api/home-feed.ts) contain separate event and content sections.
  [Home selectors](../../src/features/home/fan/fan-home-selectors.ts) discard image URLs and
  currently map trending content into clip cards.

## Proposed Decision

### 1. Keep creation native and domain-owned

Expose in-app creation, preview, publication, editing and withdrawal journeys for each supported
kind. Keep screen behavior in its feature, route files thin, and business rules in backend services.
There is no external-provider dependency or import step in this decision.

| Kind                          | Canonical owner                              | Native creation and Home presentation                                                                                                  |
| ----------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Event/gig                     | Events domain                                | Create schedule, physical venue/location, description, lineup, optional ticket link and poster; show a gig card opening event details. |
| Photo/poster/promotional post | Content domain with managed image asset      | Upload an image, add title/description and author attribution, optionally link an event; show a photo post opening its detail view.    |
| Article                       | Content domain with article-specific payload | Compose title, excerpt and body, optionally add a cover; show a preview opening a full reader.                                         |
| Video clip                    | Existing content/media domains               | Preserve the upload/playback contract and Discover experience; retain existing Home previews.                                          |

An event poster is artwork attached to an event. Publishing that artwork as a promotional post
is a separate, explicit user action. It must not automatically create a second feed item.
A promotional post references the event's canonical ID rather than duplicating its schedule.

### 2. Reuse stable content infrastructure, not a universal upload or renderer

Reuse authenticated API clients, response validation, React Query patterns, content ownership,
location, likes/saves for content posts and established Home UI primitives. Extract shared metadata
or form behavior only when the new journeys establish independent stable callers.

Do not route images through Cloudflare Stream or force articles through video processing.
Managed image storage needs its own narrow upload/delivery boundary, with file validation,
ownership, readiness, failure/retry and cleanup. Reuse lifecycle invariants where applicable,
not video-only states or transport.

Keep full-screen paging, active-player state and playback prefetching in Discover. Do not expand
`/feed/videos` to return photos, events or articles.

Event cards are not automatically engageable content posts: current likes/saves target content
IDs. Decide separately whether event bookmarking is required; do not pass event IDs into
content-engagement endpoints.

### 3. Define publication separately from media and event status

Proposed target: a creator can save a private draft, preview it and explicitly publish it.
Only eligible public, published records may enter Home. A failed or incomplete image upload
cannot publish an apparently successful post.

An event's scheduled/cancelled state is distinct from whether its draft is published. Retain
published cancelled-event details with a clear notice, but exclude them from upcoming
recommendations. Define rescheduling behavior before implementation.

Authorize creation, edits, publication, withdrawal and asset deletion at the server boundary.
Validate any linked event's existence and the caller's permission to promote it. Do not infer
authority from a role selection, venue name or client-supplied author ID.

Existing publishing behavior and existing events require an explicit compatibility/backfill
policy; changing defaults must not silently hide current content.

### 4. Model articles explicitly

Add an article kind rather than overloading announcements or the short description field.
Keep common post metadata in Content and article-specific body/format data in an owned payload.
Home receives an excerpt and optional cover, not every article's full body; the reader fetches
the body on demand.

Choose and version the body format before migration. Plain text with paragraphs is the simplest
candidate; structured rich text is an alternative if required. Arbitrary HTML is not a safe
default. Specify limits, link handling, validation and accessibility for the selected format.

### 5. Give Home typed, kind-specific projections

Keep events distinct from content posts in the wire model. Use explicit discriminants for
photo, promotional, article and video previews rather than relying on whichever nullable field
happens to be present. Preserve existing Home fields for older clients during additive rollout.

Keep the current section-based Home layout initially; new content gets explicit presentations.
A single mixed infinite feed is not approved by this ADR. Choose section labels, limits and
placement before designing its response fields.

Home selectors own view-model mapping; cards own rendering and navigation. Show creator
attribution, title and description for photo/promotional posts, and author, title and excerpt
for articles. If unique usernames are required, define their profile/API contract; do not label
the current display-name field as a username.

Specify loading, empty, offline, retry, permission-denied and removed-content behavior.
Use native event time/location eligibility for gigs and content-appropriate discovery signals
for posts. Video watch-completion scoring must not silently rank photos or articles.

## Decisions Required Before Acceptance

1. Creation/publishing permission matrix for fans, comedians, venues and promoters. Specify
   the minimum native promoter/physical-venue ownership model without making broad team-account
   infrastructure a speculative prerequisite.
2. Author attribution: display names, unique handles, organization attribution, or a combination.
3. Draft/edit/withdrawal behavior, publication review if any, and treatment of previously
   published records. Define editing while media is being replaced.
4. Single image versus galleries; supported formats, size/dimension limits, storage provider,
   cover/poster reuse and user acknowledgement of artwork rights.
5. Article format, body limits and editing semantics.
6. Home section placement, eligibility, limits, cancelled-event behavior and optional event
   bookmarking. New content must not be mislabeled as "Fresh clips."

These are unresolved decisions, not requirements already implemented or accepted.

## Alternatives

- Extend the video composer/player for every kind: rejected; media transport and presentation
  differ, and this risks the working Discover journey.
- Store articles as announcements/descriptions: rejected; obscures body semantics and limits.
- Use external image URLs as the photo-upload workflow: rejected as the native target; the app
  cannot establish managed upload readiness, ownership and cleanup from a URL alone.
- Introduce a universal content framework or mixed feed immediately: deferred; prefer owned
  models and existing sections over speculative configuration.

## Consequences

Native creation works without external services beyond the app's own infrastructure. Existing
content and feed primitives reduce duplication, while event and article semantics remain explicit.
The tradeoff is new image management, editing/publishing contracts and kind-specific UI/tests.
Promoter authorization and genuine username support cannot be implied by today's schemas.

## Rollout and Rollback

After acceptance, ship additive migrations and backward-compatible backend/read schemas before
exposing new composers. Backfill current event publication state deliberately. Deliver native
events/posters, photo/promotional posts and articles incrementally, validating after each slice.
Read the exact Expo SDK 56 docs before changing any Expo API.

Gate new creation surfaces independently. Rollback disables those surfaces and new Home
sections without deleting user-authored records or breaking existing event/video clients.
Keep required asset/read support for already-published content; do not drop populated columns
or stored media as a rollback shortcut.

## Verification

- Native journeys create, preview, publish, edit and withdraw without any external account.
- Ownership/publication/linked-event/asset tests cover unauthorized access and private drafts.
- Image tests cover invalid files, failure/retry, cleanup and inaccessible/removed media.
- Article tests cover body validation, safe rendering and preview-versus-detail responses.
- Producer/consumer tests cover old Home responses and each new kind's required fields.
- Home tests cover real images, correct attribution, navigation and loading/error/empty states.
- Cancellation updates gig eligibility; editing a linked event does not leave copied logistics
  in promotional posts.
- Run focused existing Jest/pytest tests, affected type/lint checks and simulator/device
  journeys, including a regression of video upload and Discover playback.

This document records a proposal only; no runtime contracts or behavior change with its addition.
