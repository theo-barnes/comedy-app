import { useEffect, useState } from 'react';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { z } from 'zod/v3';

import { queryKeys } from '@/lib/api/keys';

const discoveryRegionSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.union([z.literal('city'), z.literal('neighbourhood'), z.literal('borough')]),
  center: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

const discoveryRegionsResponseSchema = z.object({
  scopeType: z.union([z.literal('city_cluster'), z.literal('neighbourhood_cluster')]),
  regions: z.array(discoveryRegionSchema),
});

export type DiscoveryRegion = z.infer<typeof discoveryRegionSchema>;
export type DiscoveryRegionsResponse = z.infer<typeof discoveryRegionsResponseSchema>;

const DEFAULT_CACHE_BUCKET_SIZE = 0.05;
const DEFAULT_DEBOUNCE_MS = 250;

function bucketCoordinate(value: number, bucketSize = DEFAULT_CACHE_BUCKET_SIZE): number {
  return Math.round(value / bucketSize);
}

function buildDiscoveryRegionsUrl(latitude: number, longitude: number): string {
  const baseUrl = process.env.EXPO_PUBLIC_DISCOVERY_API_URL?.replace(/\/$/, '');
  if (!baseUrl) {
    return `/discovery-regions?lat=${latitude}&lng=${longitude}`;
  }

  const url = new URL('/discovery-regions', baseUrl);
  url.searchParams.set('lat', latitude.toString());
  url.searchParams.set('lng', longitude.toString());
  return url.toString();
}

async function fetchDiscoveryRegions(
  latitude: number,
  longitude: number,
): Promise<DiscoveryRegionsResponse> {
  const response = await fetch(buildDiscoveryRegionsUrl(latitude, longitude));
  if (!response.ok) {
    throw new Error(`Failed to load discovery regions (${response.status})`);
  }

  return discoveryRegionsResponseSchema.parse((await response.json()) as unknown);
}

function useDebouncedCoordinates(
  latitude: number | null,
  longitude: number | null,
  delayMs = DEFAULT_DEBOUNCE_MS,
): { latitude: number | null; longitude: number | null } {
  const [debounced, setDebounced] = useState({ latitude, longitude });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced({ latitude, longitude });
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [delayMs, latitude, longitude]);

  return debounced;
}

export function useDiscoveryRegions(latitude: number | null, longitude: number | null) {
  const debounced = useDebouncedCoordinates(latitude, longitude);
  const hasCoordinates = debounced.latitude != null && debounced.longitude != null;
  const resolvedLatitude = debounced.latitude;
  const resolvedLongitude = debounced.longitude;
  const latitudeBucket =
    hasCoordinates && resolvedLatitude != null ? bucketCoordinate(resolvedLatitude) : 0;
  const longitudeBucket =
    hasCoordinates && resolvedLongitude != null ? bucketCoordinate(resolvedLongitude) : 0;

  return useQuery({
    queryKey: queryKeys.discoveryRegions(latitudeBucket, longitudeBucket),
    queryFn: () => {
      if (!hasCoordinates || resolvedLatitude == null || resolvedLongitude == null) {
        return Promise.resolve({ scopeType: 'city_cluster' as const, regions: [] });
      }

      return fetchDiscoveryRegions(resolvedLatitude, resolvedLongitude);
    },
    enabled: hasCoordinates && !!process.env.EXPO_PUBLIC_DISCOVERY_API_URL,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export { buildDiscoveryRegionsUrl, bucketCoordinate };
