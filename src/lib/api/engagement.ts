import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiSend } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';

export function toggleLike(contentId: string, liked: boolean): Promise<void> {
  return apiSend(`/content/${contentId}/like`, { method: liked ? 'DELETE' : 'POST' });
}

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, liked }: { contentId: string; liked: boolean }) =>
      toggleLike(contentId, liked),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.videoFeedRoot }),
  });
}
