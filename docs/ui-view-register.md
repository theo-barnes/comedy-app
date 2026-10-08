# UI View Register

Last inventory update: 2026-10-08.

This is persistent, versioned UI memory for people and agents, not a claim that every page has
been visually reviewed. Read it before user-visible work, including backend changes that alter
page states. The [agent workflow](agent-workflow.md) and frontend instructions require updates
in the same change. Execution details belong in the linked plans.

## Update Protocol

- Keep stable view IDs across route renames and redesigns. Add new IDs for genuinely new views;
  retain retired IDs with their replacement rather than deleting the history.
- Record route/feature ownership, implementation and design status, relevant states, evidence,
  outstanding guidance and the next action. Add planned views before implementing them.
- Update affected entries when navigation, layout, data, permissions or error states change.
  Date the update and link the plan/PR or supplied design reference.
- Separate source inspection, automated checks, user reports and simulator/device evidence.
  Passing tests is not visual approval; a successful user journey is not approval of all states.
- Record screenshot references when supplied, with the user's guidance and any superseding
  decision. Do not invent a reference or put credentials/personal account data in screenshots.
- Provisional approval is scoped. Gig creation and gig posters have it; it is not blanket
  permission to redesign other pages. Request guidance for unapproved UI work.

Implementation: **implemented**, **placeholder**, **planned**, or **retired**.
Design: **not assessed**, **provisional approved**, **reference guided**, or **approved**.
Reference guided means a supplied design has been applied, not that acceptance was given.

## Existing Pages and Navigation

Baseline evidence for this inventory is repository source inspection, not a fresh device run.
No screenshot reference has been supplied for the entries below. Design is not assessed except
where the user explicitly authorized provisional work.

| Stable ID              | View and owning source                                                                       | Implementation                         | Design                                          | Next action                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------- |
| `onboarding-tour`      | Three-slide tour: [route](<../app/(onboarding)/index.tsx>)                                   | Implemented                            | Not assessed                                    | Review slides, completion and navigation when changing onboarding.     |
| `auth-sign-in`         | [Sign in](<../app/(auth)/sign-in.tsx>)                                                       | Implemented                            | Not assessed                                    | Record form/error/device evidence when next changed.                   |
| `auth-sign-up`         | [Sign up](<../app/(auth)/sign-up.tsx>)                                                       | Implemented                            | Not assessed                                    | Record validation, consent and verification states when next changed.  |
| `auth-role`            | [Select role](<../app/(auth)/select-role.tsx>)                                               | Implemented                            | Not assessed                                    | Preserve current role choices; promoter UI is not approved.            |
| `auth-forgot-password` | [Password recovery](<../app/(auth)/forgot-password.tsx>)                                     | Implemented                            | Not assessed                                    | Review request/result/deep-link journey before expanding recovery.     |
| `auth-verify-email`    | [Email-verification notice](<../app/(auth)/verify-email.tsx>)                                | Implemented                            | Not assessed                                    | Check copy and return-to-sign-in navigation when changed.              |
| `auth-callback`        | [Auth callback](<../app/(auth)/auth-callback.tsx>)                                           | Implemented                            | Not assessed                                    | Preserve verifying, invalid-code and exchange-failure states.          |
| `navigation-tabs`      | [Native and JS tab navigation](<../app/(tabs)/_layout.tsx>)                                  | Implemented                            | Not assessed                                    | Check both platform variants and role-dependent Create visibility.     |
| `home-fan`             | Home tab: [Fan Home](../src/features/home/fan/FanHome.tsx)                                   | Implemented                            | Not assessed                                    | Add actual gig artwork without redesigning unrelated Home sections.    |
| `home-comedian`        | Home tab: [Comedian Home](../src/features/home/comedian/ComedianHome.tsx)                    | Placeholder body; shared header/layout | Not assessed                                    | Role-specific Home content remains separate future work.               |
| `home-venue`           | Home tab: [Venue Home](../src/features/home/venue/VenueHome.tsx)                             | Implemented                            | Provisional approved for gig-creation additions | Add a clear poster-management entry on owned gigs.                     |
| `discover-feed`        | Discover tab: [role dispatcher](../src/features/discover/search.tsx)                         | Implemented                            | Not assessed                                    | Preserve working video upload/playback; check affected role variants.  |
| `discover-search`      | [Search page](../app/discover-search.tsx)                                                    | Placeholder                            | Not assessed                                    | Obtain scope/design guidance before implementing search.               |
| `map`                  | [Map tab](<../app/(tabs)/map.tsx>)                                                           | Placeholder                            | Not assessed                                    | Obtain scope/design guidance before implementing a map.                |
| `tickets-saved`        | [Tickets / saved items](<../app/(tabs)/tickets.tsx>)                                         | Implemented saved-content list         | Not assessed                                    | Do not imply ticket purchases or event bookmarks are implemented.      |
| `profile-self`         | [Own profile tab](<../app/(tabs)/profile.tsx>)                                               | Implemented                            | Not assessed                                    | Record role-specific states and evidence when next changed.            |
| `profile-public`       | [Public profile](../app/profile/[userId].tsx)                                                | Implemented                            | Not assessed                                    | Review missing/private/error states when next changed.                 |
| `video-create`         | Create tab: [video uploader](../src/features/upload/UploadVideoScreen.tsx)                   | Implemented                            | Not assessed                                    | Preserve selection, progress, retry/cancel and publication behavior.   |
| `gig-create`           | [Create gig](../src/features/events/CreateEventScreen.tsx), [route](../app/create-event.tsx) | Implemented                            | Provisional approved                            | Add optional poster controls; retain venue-only publication.           |
| `venue-setup`          | Within Create gig: [venue setup](../src/features/events/VenueSetupForm.tsx)                  | Implemented                            | Provisional approved                            | Preserve address/coordinate validation and geocoding failure recovery. |

Redirect-only auth entry points and layout files without their own visible view are not separate
pages. Shared navigation is registered once, not once per platform. Add separate role-view IDs
if their behavior/design diverges materially from the shared Discover view.

## Gig-Poster Views and States

Planning approval on 2026-10-08 allows a provisional themed UI for this slice. Nothing in this
table means posters are implemented. See the [gig-poster plan](plans/active/gig-posters.md).

| Stable ID            | Placement / owner                                                                                     | Implementation | Design                                    | States to implement and verify                                                                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- | -------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gig-poster-compose` | Optional section inside `gig-create`; events feature                                                  | Planned        | Provisional approved                      | No poster, picker cancel/permission denial, preview, unsupported/oversized image, remove selection, upload/processing progress, explicit gig-created/poster-failed recovery. |
| `gig-poster-manage`  | Poster-only page opened from `home-venue`; events feature; route to be selected during implementation | Planned        | Provisional approved                      | Ownership/loading/error, current/no poster, add, replacement preview/progress, retain old poster on failure, remove confirmation/failure, conflict and retry.                |
| `gig-poster-display` | Existing gig cards in `home-fan` and owned list in `home-venue`; Home/events owners                   | Planned        | Provisional approved for poster additions | No-poster fallback, loading/broken image, aspect-ratio-safe rendering, replacement/removal refresh, cancelled gig notice where already applicable.                           |

An OS image picker is part of the compose/manage journeys, not an app-owned page. A larger
poster preview can be a subview of management; a new public gig-detail page is not assumed.

## Evidence and Guidance Log

| Date       | IDs                                                             | Evidence / guidance                                                                                                                                                            | Limitations / next step                                                                                                                                                 |
| ---------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-08 | `gig-create`, `venue-setup`, `home-venue`                       | User authorized provisional form UI, then reported the delivered gig functionality worked well. [Venue plan](plans/active/venue-gig-creation.md) records automated validation. | No supplied screenshot or final design acceptance. Earlier simulator run was not authorized; do not infer every permission/geocoding/DST/error state was device-tested. |
| 2026-10-08 | `video-create`, `discover-feed`                                 | User reports Discover uploads and playback work excellently.                                                                                                                   | Preserve this baseline; no new poster-related regression run yet.                                                                                                       |
| 2026-10-08 | `gig-poster-compose`, `gig-poster-manage`, `gig-poster-display` | User authorized provisional gig-poster UI and requested this persistent register.                                                                                              | Planning only. Add actual implementation, command results and device evidence in the implementation change.                                                             |

Next inventory maintenance: implement the approved poster slice, update its three planned views
and affected existing-page entries, and preserve final-design follow-ups until guidance arrives.
