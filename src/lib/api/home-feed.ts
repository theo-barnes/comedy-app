import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { z } from 'zod/v3';

import { apiFetch, isApiConfigured } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';

export const feedItemSchema = z.object({
  contentId: z.string(),
  contentType: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  creatorId: z.string(),
  creatorName: z.string(),
  publishedAt: z.string(),
  hlsUrl: z.string().nullish(),
  thumbnailUrl: z.string().nullish(),
  imageUrl: z.string().nullish(),
  linkedEvent: z
    .object({
      id: z.string(),
      title: z.string(),
      startTime: z.string(),
      venueId: z.string(),
      ticketUrl: z.string().nullish(),
    })
    .nullish(),
  likeCount: z.number(),
  saveCount: z.number(),
  viewerLiked: z.boolean(),
  viewerSaved: z.boolean(),
});

const nearbyEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startTime: z.string(),
  venueId: z.string(),
  venueName: z.string(),
  ticketUrl: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
});

const comedianSummarySchema = z.object({
  userId: z.string(),
  stageName: z.string(),
  bio: z.string().nullish(),
});

const homeFeedResponseSchema = z.object({
  nearbyEvents: z.array(nearbyEventSchema),
  trendingClips: z.array(feedItemSchema),
  followedCreators: z.array(feedItemSchema),
  newComedians: z.array(comedianSummarySchema),
});

export type FeedItem = z.infer<typeof feedItemSchema>;
export type NearbyEvent = z.infer<typeof nearbyEventSchema>;
export type ComedianSummary = z.infer<typeof comedianSummarySchema>;
export type HomeFeedResponse = z.infer<typeof homeFeedResponseSchema>;

export function useHomeFeed(latitude: number | null, longitude: number | null) {
  return useQuery({
    queryKey: queryKeys.homeFeed(latitude, longitude),
    queryFn: () =>
      apiFetch('/feed/home', {
        schema: homeFeedResponseSchema,
        searchParams: {
          lat: latitude ?? undefined,
          lng: longitude ?? undefined,
        },
      }),
    enabled: isApiConfigured(),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
}
