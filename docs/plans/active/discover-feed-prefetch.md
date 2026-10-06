# Warm Discover Feed at App Bootstrap

## Scope

Warm the existing first Discover feed page after an authenticated, role-ready session is available, before the user opens the Discover tab. This is a frontend cache lifecycle change; it does not alter the feed API, ranking, pagination, or video-media buffering.

## Decisions

- Risk: medium. The change crosses app bootstrap, auth lifecycle, location updates, and React Query cache ownership.
- `DiscoverFeedPrefetcher` belongs to the Discover feature and is mounted below the auth, location, and query providers. Auth remains responsible for session state; location remains responsible for permissions and coordinates.
- `videoFeedInfiniteQueryOptions` is shared by `useVideoFeed` and `prefetchInfiniteQuery` so their key, pagination shape, stale time, and request function cannot drift.
- Warm the generic `(null, null)` key as soon as eligibility is met, then warm the coordinate-specific key when location resolves. React Query deduplicates same-key work.
- Only real signed-in, role-ready users prefetch. Guests are excluded because the endpoint requires a bearer token.
- Remove `videoFeedRoot` cache entries before exposing a sign-out or different-account session because feed responses include viewer-specific liked/saved state.

## Acceptance Checks

- [x] The Discover query and prefetch use identical infinite-query options.
- [x] An eligible viewer warms the generic key and then a resolved location key.
- [x] A guest does not request the authenticated endpoint.
- [x] Signing out removes cached Discover feed data.
- [x] Focused Jest, affected lint, and TypeScript checks pass.
- [x] Full frontend quality suite passes.
- [ ] Device journey confirms a cold signed-in launch can open Discover without a new first-page loading delay when the network permits.

## Validation

- `pnpm test:focused -- video-feed.test.ts` — passed.
- `pnpm test:focused -- DiscoverFeedPrefetcher.test.tsx` — passed.
- `pnpm test:focused -- DiscoverFeedPrefetcher.test.tsx AuthProvider.test.tsx` — passed.
- `pnpm exec eslint ... && pnpm typecheck` — passed for all changed source and test files.
- `pnpm quality` — passed: 81 suites and 322 tests. Existing React `act(...)` console warnings remain in unrelated upload and glass-surface tests.

## Rollout and Rollback

- Rollout is client-only and backwards compatible with the existing endpoint.
- Roll back by removing the prefetcher mount; Discover retains its existing on-tab fetch behavior. The query-options extraction remains compatible with the current hook.

## Next Action

Exercise the signed-in cold-launch journey on device or simulator through the existing Metro server on port 8081. Move this record to `docs/plans/completed/` after that check and delivery are complete.
