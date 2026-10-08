import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod/v3';

import { ApiError, apiFetch, apiMutation, isApiConfigured } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';

export const creatorProfileSchema = z.object({
  id: z.string(),
  creatorType: z.enum(['comedian', 'venue']),
  name: z.string(),
  bio: z.string().nullish(),
  genres: z.array(z.string()),
  address: z.string().nullish(),
  capacity: z.number().nullish(),
  verified: z.boolean(),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
});

export const eventSchema = z.object({
  id: z.string(),
  venueId: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }).nullish(),
  placeId: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  ticketUrl: z.string().nullish(),
  status: z.enum(['scheduled', 'cancelled']),
  comedianIds: z.array(z.string()),
  posterUrl: z.string().url().nullish(),
  posterRevision: z.number().int().nonnegative().optional(),
  posterWidth: z.number().int().positive().nullish(),
  posterHeight: z.number().int().positive().nullish(),
});

export type CreatorProfile = z.infer<typeof creatorProfileSchema>;
export type VenueEvent = z.infer<typeof eventSchema>;
export type NativeEventInput = {
  title: string;
  description?: string;
  localStartTime: string;
  localEndTime?: string;
  timeZone: string;
  ticketUrl?: string;
};
export type VenueProfileInput = {
  name: string;
  bio: string | null;
  genres: string[];
  address: string;
  capacity: number | null;
  latitude: number;
  longitude: number;
};

export async function fetchMyCreatorProfile(): Promise<CreatorProfile | null> {
  try {
    return await apiFetch('/creators/me', { schema: creatorProfileSchema });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function saveVenueProfile(input: VenueProfileInput): Promise<CreatorProfile> {
  return apiMutation('/creators/me', {
    method: 'PUT',
    body: input,
    schema: creatorProfileSchema,
  });
}

export function createNativeEvent(
  input: NativeEventInput & { idempotencyKey?: string },
): Promise<VenueEvent> {
  const { idempotencyKey, ...body } = input;
  return apiMutation('/events/native', {
    method: 'POST',
    body,
    schema: eventSchema,
    ...(idempotencyKey !== undefined ? { idempotencyKey } : {}),
  });
}

export function useMyCreatorProfile(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.creatorProfile(userId ?? 'anonymous'),
    queryFn: fetchMyCreatorProfile,
    enabled: !!userId && enabled && isApiConfigured(),
    retry: (count, error) =>
      !(error instanceof ApiError && [401, 403].includes(error.status)) && count < 1,
  });
}

export function useSaveVenueProfile(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveVenueProfile,
    retry: false,
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.creatorProfile(userId), profile);
      void queryClient.invalidateQueries({ queryKey: queryKeys.publicProfile(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.homeFeedRoot });
    },
  });
}

export function useCreateNativeEvent(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createNativeEvent,
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.venueEvents(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.homeFeedRoot });
    },
  });
}

export function useVenueEvents(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.venueEvents(userId ?? 'anonymous'),
    queryFn: () =>
      apiFetch(`/venues/${userId}/events`, {
        schema: z.object({ items: z.array(eventSchema) }),
      }),
    enabled: !!userId && enabled && isApiConfigured(),
  });
}
