import { useInfiniteQuery } from '@tanstack/react-query';
import { z } from 'zod/v3';

import { apiFetch, isApiConfigured } from '@/lib/api/client';
import { feedItemSchema } from '@/lib/api/home-feed';
import { queryKeys } from '@/lib/api/keys';

const videoFeedResponseSchema = z.object({
  items: z.array(feedItemSchema),
  nextCursor: z.string().nullish(),
});

export type VideoFeedResponse = z.infer<typeof videoFeedResponseSchema>;

type FetchVideoFeedPageOptions = {
  latitude: number | null;
  longitude: number | null;
  cursor?: string;
  limit?: number;
};

export function fetchVideoFeedPage({
  latitude,
  longitude,
  cursor,
  limit = 10,
}: FetchVideoFeedPageOptions): Promise<VideoFeedResponse> {
  return apiFetch('/feed/videos', {
    schema: videoFeedResponseSchema,
    searchParams: {
      lat: latitude ?? undefined,
      lng: longitude ?? undefined,
      cursor,
      limit,
    },
  });
}

export function useVideoFeed(latitude: number | null, longitude: number | null) {
  return useInfiniteQuery({
    queryKey: queryKeys.videoFeed(latitude, longitude),
    queryFn: ({ pageParam }) => fetchVideoFeedPage({ latitude, longitude, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isApiConfigured(),
    staleTime: 30 * 1000,
  });
}
