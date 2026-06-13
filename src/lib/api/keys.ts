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
  discoveryRegions: (latitudeBucket: number, longitudeBucket: number) =>
    ['discovery-regions', latitudeBucket, longitudeBucket] as const,
};
