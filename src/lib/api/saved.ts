import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod/v3';

import { apiFetch, apiSend, isApiConfigured } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';

const savedItemSchema = z.object({
  contentId: z.string(),
  savedAt: z.string(),
  title: z.string(),
  contentType: z.string(),
  creatorId: z.string(),
  thumbnailUrl: z.string().nullish(),
  imageUrl: z.string().nullish(),
});

const savedListResponseSchema = z.object({
  items: z.array(savedItemSchema),
});

export type SavedItem = z.infer<typeof savedItemSchema>;

export function useSavedItems() {
  return useQuery({
    queryKey: queryKeys.saved,
    queryFn: () => apiFetch('/me/saved', { schema: savedListResponseSchema }),
    enabled: isApiConfigured(),
    staleTime: 60 * 1000,
  });
}

export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contentId, saved }: { contentId: string; saved: boolean }) =>
      apiSend(`/content/${contentId}/save`, { method: saved ? 'DELETE' : 'POST' }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.saved }),
  });
}
