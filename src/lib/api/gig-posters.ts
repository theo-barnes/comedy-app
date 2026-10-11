import { useQuery, type QueryClient } from '@tanstack/react-query';
import { z } from 'zod/v3';

import { apiFetch, apiMutation, isApiConfigured } from '@/lib/api/client';
import { eventSchema, type VenueEvent } from '@/lib/api/events';
import { queryKeys } from '@/lib/api/keys';

const posterConfigSchema = z.object({
  maxBytes: z.number().int().positive(),
  maxPixels: z.number().int().positive(),
  supportedContentTypes: z.array(z.string()),
});

const posterUploadSchema = z.object({
  assetId: z.string().min(1),
  uploadUrl: z.string().url(),
  uploadToken: z.string().min(1),
  bucketName: z.string().min(1),
  objectName: z.string().min(1),
});

const preparedPosterSchema = z.object({
  assetId: z.string().min(1),
  status: z.literal('ready'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export type PosterConfig = z.infer<typeof posterConfigSchema>;
export type PosterUploadIntent = z.infer<typeof posterUploadSchema>;
const publishedEventSchema = eventSchema.refine(
  (event) => event.publicationStatus === 'published',
  'Gig publication has not completed.',
);

export function fetchPosterConfig(): Promise<PosterConfig> {
  return apiFetch('/events/poster-config', { schema: posterConfigSchema });
}

export function usePosterConfig(enabled = true) {
  return useQuery({
    queryKey: queryKeys.posterConfig,
    queryFn: fetchPosterConfig,
    enabled: enabled && isApiConfigured(),
    retry: false,
    staleTime: 60 * 1000,
  });
}

export function fetchEvent(eventId: string): Promise<VenueEvent> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}`, { schema: eventSchema });
}

export function useEvent(eventId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.event(eventId ?? 'missing'),
    queryFn: () => fetchEvent(eventId ?? ''),
    enabled: !!eventId && enabled && isApiConfigured(),
    retry: false,
  });
}

export function createPosterUpload(
  eventId: string,
  file: { contentType: string; fileSize: number },
  signal?: AbortSignal,
): Promise<PosterUploadIntent> {
  return apiMutation(`/events/${encodeURIComponent(eventId)}/poster/uploads`, {
    method: 'POST',
    body: file,
    schema: posterUploadSchema,
    signal,
  });
}

export function completePosterUpload(eventId: string, assetId: string, signal?: AbortSignal) {
  return apiMutation(
    `/events/${encodeURIComponent(eventId)}/poster/uploads/${encodeURIComponent(assetId)}/complete`,
    { method: 'POST', body: {}, schema: preparedPosterSchema, signal },
  );
}

export function attachGigPoster(
  input: { eventId: string; assetId: string; expectedRevision: number },
  signal?: AbortSignal,
): Promise<VenueEvent> {
  return apiMutation(`/events/${encodeURIComponent(input.eventId)}/poster`, {
    method: 'PUT',
    body: { assetId: input.assetId, expectedRevision: input.expectedRevision },
    schema: publishedEventSchema,
    signal,
  });
}

export function publishGig(
  input: { eventId: string; assetId: string; expectedRevision: number },
  signal?: AbortSignal,
): Promise<VenueEvent> {
  return apiMutation(`/events/${encodeURIComponent(input.eventId)}/publish`, {
    method: 'POST',
    body: { assetId: input.assetId, expectedRevision: input.expectedRevision },
    schema: publishedEventSchema,
    signal,
  });
}

export function refreshPosterQueries(queryClient: QueryClient, userId: string, eventId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.venueEvents(userId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.homeFeedRoot });
  void queryClient.invalidateQueries({ queryKey: queryKeys.videoFeedRoot });
}
