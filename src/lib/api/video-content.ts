import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod/v3';

import { apiFetch, apiMutation, apiSend, isApiConfigured } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';

const mediaSchema = z.object({
  id: z.string(),
  status: z.string(),
  hlsUrl: z.string().nullish(),
  thumbnailUrl: z.string().nullish(),
  durationSeconds: z.number().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  error: z.string().nullish(),
  errorCode: z.string().nullish(),
  uploadExpiresAt: z.string().nullish(),
});

const contentSchema = z.object({
  id: z.string(),
  creatorId: z.string(),
  type: z.string(),
  title: z.string(),
  description: z.string().nullish(),
  status: z.string(),
  visibility: z.string(),
  publishedAt: z.string().nullish(),
  createdAt: z.string().nullish(),
  media: mediaSchema.nullish(),
});

const createVideoResponseSchema = z.object({
  content: contentSchema,
  uploadUrl: z.string().nullish(),
  upload: z
    .object({
      mediaAssetId: z.string(),
      protocol: z.string(),
      url: z.string(),
      expiresAt: z.string().nullish(),
      headers: z.record(z.string()),
    })
    .nullish(),
});

export type VideoContent = z.infer<typeof contentSchema>;
export type CreateVideoResponse = z.infer<typeof createVideoResponseSchema>;

export type CreateVideoInput = {
  caption: string;
  file: {
    name?: string | null;
    sizeBytes: number;
    mimeType: string;
    durationMs?: number | null;
    width?: number | null;
    height?: number | null;
  };
};

export function createVideo(input: CreateVideoInput): Promise<CreateVideoResponse> {
  return apiMutation('/content', {
    method: 'POST',
    schema: createVideoResponseSchema,
    body: {
      type: 'video_clip',
      title: input.caption.trim().slice(0, 200) || 'Comedy clip',
      description: input.caption.trim() || null,
      visibility: 'public',
      file: input.file,
    },
  });
}

export function completeVideoUpload(
  contentId: string,
  mediaAssetId: string,
  bytesUploaded: number,
): Promise<VideoContent> {
  return apiMutation(`/content/${contentId}/upload-complete`, {
    method: 'POST',
    schema: contentSchema,
    body: { mediaAssetId, bytesUploaded },
  });
}

export function deleteVideoContent(contentId: string): Promise<void> {
  return apiSend(`/content/${contentId}`, { method: 'DELETE' });
}

export function useCreateVideo() {
  return useMutation({ mutationFn: createVideo });
}

export function useContentStatus(contentId: string | null) {
  return useQuery({
    queryKey: queryKeys.content(contentId ?? 'pending'),
    queryFn: () => apiFetch(`/content/${contentId}`, { schema: contentSchema }),
    enabled: isApiConfigured() && contentId != null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'processing' ? 3000 : false;
    },
  });
}

export function useCompleteVideoUpload() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contentId,
      mediaAssetId,
      bytesUploaded,
    }: {
      contentId: string;
      mediaAssetId: string;
      bytesUploaded: number;
    }) => completeVideoUpload(contentId, mediaAssetId, bytesUploaded),
    onSuccess: (content) => {
      queryClient.setQueryData(queryKeys.content(content.id), content);
    },
  });
}
