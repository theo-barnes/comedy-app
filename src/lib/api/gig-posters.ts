import { useMutation, useQuery, type QueryClient, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod/v3';

import { ApiError, apiFetch, apiMutation, isApiConfigured } from '@/lib/api/client';
import { eventSchema, type VenueEvent } from '@/lib/api/events';
import { queryKeys } from '@/lib/api/keys';

const posterConfigSchema = z.object({
  enabled: z.boolean(),
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

export async function fetchPosterConfig(): Promise<PosterConfig | null> {
  try {
    return await apiFetch('/events/poster-config', { schema: posterConfigSchema });
  } catch (error) {
    // An older backend has no poster capability; do not mask other API failures.
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
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
    schema: eventSchema,
    signal,
  });
}

export function refreshPosterQueries(queryClient: QueryClient, userId: string, eventId: string) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.venueEvents(userId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.homeFeedRoot });
  void queryClient.invalidateQueries({ queryKey: queryKeys.videoFeedRoot });
}

export function useRemoveGigPoster(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { eventId: string; expectedRevision: number }) =>
      apiMutation(`/events/${encodeURIComponent(input.eventId)}/poster`, {
        method: 'DELETE',
        body: { expectedRevision: input.expectedRevision },
        schema: eventSchema,
      }),
    retry: false,
    onSuccess: (event) => queryClient.setQueryData(queryKeys.event(event.id), event),
    onSettled: (_event, _error, input) => refreshPosterQueries(queryClient, userId, input.eventId),
  });
}
