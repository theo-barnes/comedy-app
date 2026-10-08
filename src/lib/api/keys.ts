/**
 * Central query-key factory.
 *
 * Every React Query key in the app is minted here so cache invalidation is
 * grep-able and collision-free. Keys are hierarchical: invalidating
 * `['profile']` clears every user's profile entry.
 */
export const queryKeys = {
  profiles: ['profile'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  publicProfiles: ['public-profile'] as const,
  publicProfile: (userId: string) => ['public-profile', userId] as const,
  discoveryRegions: (latitudeBucket: number, longitudeBucket: number) =>
    ['discovery-regions', latitudeBucket, longitudeBucket] as const,
  saved: ['saved'] as const,
  creatorProfile: (userId: string) => ['creator-profile', userId] as const,
  venueEvents: (userId: string) => ['venue-events', userId] as const,
  homeFeedRoot: ['home-feed'] as const,
  homeFeed: (latitude: number | null, longitude: number | null) =>
    [
      ...queryKeys.homeFeedRoot,
      latitude != null ? Math.round(latitude * 20) : null,
      longitude != null ? Math.round(longitude * 20) : null,
    ] as const,
  videoFeedRoot: ['video-feed'] as const,
  videoFeed: (latitude: number | null, longitude: number | null) =>
    [
      ...queryKeys.videoFeedRoot,
      latitude != null ? Math.round(latitude * 20) : null,
      longitude != null ? Math.round(longitude * 20) : null,
    ] as const,
  content: (contentId: string) => ['content', contentId] as const,
};
