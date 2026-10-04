import { useQuery } from '@tanstack/react-query';
import { z } from 'zod/v3';

import { apiFetch, isApiConfigured } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';

export const publicProfileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;

export function fetchPublicProfile(userId: string): Promise<PublicProfile> {
  return apiFetch(`/profiles/${encodeURIComponent(userId)}`, { schema: publicProfileSchema });
}

export function usePublicProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.publicProfile(userId),
    queryFn: () => fetchPublicProfile(userId),
    enabled: isApiConfigured() && !!userId,
    staleTime: 2 * 60 * 1000,
  });
}
