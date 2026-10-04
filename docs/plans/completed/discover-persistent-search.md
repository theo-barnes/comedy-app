# Persistent Discover Search

## Scope

Reuse the shared expanding search bar in Discover as a fixed top overlay above
the vertically paged video feed. Search is UI-only in this stage: typed text is
retained locally and does not filter clips, refetch the feed, or navigate.

## Risk

Medium. This changes shared component composition on a video interaction screen
but has no API, schema, or backend impact.

## Decisions

- Keep the shared `ExpandingSearchBar` unchanged; Discover owns only placement
  and local query state.
- Render the bar as an absolute sibling of the `FlatList`, never in
  `renderItem`, so it remains visible as clips page.
- Position it below the safe-area inset and allow touch handling only inside its
  bounds, leaving off-bar vertical swipes available to the feed.
- Exclude the placeholder `discover-search` route and query-backed results.

## Acceptance Checks

- Search icon remains fixed at the top while the feed pages between clips.
- Opening, typing, submitting, and closing use the existing shared behavior.
- Closing clears the local query.
- Existing clip paging, playback, captions, and action rail remain unchanged.

## Validation

- Focused Discover feed and shell tests plus shared search-bar regression test.
- Affected ESLint and TypeScript checks.
- Device or simulator journey covering clip paging, search interaction, and
  off-bar vertical swipes.

Completed locally:

- `pnpm test:ci -- __tests__/features/discover/DiscoverFeed.test.tsx` - 2 passed.
- `pnpm test:ci -- __tests__/features/discover/DiscoverFeed.test.tsx __tests__/features/discover/DiscoverShell.test.tsx __tests__/components/ExpandingSearchBar.test.tsx` - 11 passed.
- Affected ESLint and `pnpm typecheck` - passed.
- Prettier and `git diff --check` - passed.

The existing shared `ExpandingSearchBar` suite emits non-failing React `act`
warnings from its asynchronous Liquid Glass accessibility probe. The new
Discover coverage flushes that probe and runs without the warning.

## Blockers

None.

## Next Action

After merge, restart the existing Metro development server on port 8081 from
`main` with a cleared cache, then verify the device journey: page through clips,
open/type/submit/close search, and swipe outside the overlay to confirm paging
remains usable. No simulator was booted during implementation, and the existing
Metro process was deliberately left uninterrupted.
