import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { VenueEvent } from '@/lib/api/events';
import { ApiError } from '@/lib/api/client';
import {
  attachGigPoster,
  completePosterUpload,
  createPosterUpload,
  refreshPosterQueries,
} from '@/lib/api/gig-posters';
import { queryKeys } from '@/lib/api/keys';

import {
  createTusPosterUpload,
  PosterUploadCancelled,
  type PosterUploadController,
} from './poster-tus-upload';

export type PosterSelection = {
  uri: string;
  fileSize: number;
  contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  width: number;
  height: number;
};

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'attaching';
type Operation = {
  cancelled: boolean;
  abort: AbortController;
  controller?: PosterUploadController;
};
type UploadedPoster = {
  eventId: string;
  selection: PosterSelection;
  assetId: string;
  ready: boolean;
};

export function useGigPosterUpload(userId: string) {
  const queryClient = useQueryClient();
  const mounted = useRef(true);
  const active = useRef<Operation | null>(null);
  const uploaded = useRef<UploadedPoster | null>(null);
  const [state, setState] = useState<{
    userId: string;
    status: UploadStatus;
    progress: number;
    error: Error | null;
  }>({ userId, status: 'idle', progress: 0, error: null });

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const operation = active.current;
      active.current = null;
      uploaded.current = null;
      if (operation) {
        operation.cancelled = true;
        operation.abort.abort();
        if (operation.controller) {
          void operation.controller.cancel().catch(() => {
            console.warn('Unable to stop a poster upload during navigation.');
          });
        }
      }
    };
  }, [userId]);

  const upload = useCallback(
    async (event: VenueEvent, selection: PosterSelection): Promise<VenueEvent> => {
      if (active.current) throw new Error('A poster upload is already running.');
      if (event.venueId !== userId)
        throw new Error('You can only change posters on your own gigs.');
      const operation: Operation = { cancelled: false, abort: new AbortController() };
      active.current = operation;
      const ensureActive = () => {
        if (operation.cancelled || !mounted.current || active.current !== operation) {
          throw new PosterUploadCancelled();
        }
      };
      const update = (status: UploadStatus, progress = 0, error: Error | null = null) => {
        if (mounted.current && active.current === operation) {
          setState({ userId, status, progress, error });
        }
      };
      let asset = uploaded.current;
      if (asset?.eventId !== event.id || asset.selection !== selection) {
        asset = null;
        uploaded.current = null;
      }
      update(asset ? (asset.ready ? 'attaching' : 'processing') : 'uploading');
      try {
        if (!asset) {
          const intent = await createPosterUpload(
            event.id,
            { contentType: selection.contentType, fileSize: selection.fileSize },
            operation.abort.signal,
          );
          ensureActive();
          const controller = createTusPosterUpload({
            ...selection,
            intent,
            onProgress: (progress) => update('uploading', progress),
          });
          operation.controller = controller;
          controller.start();
          await controller.completed;
          operation.controller = undefined;
          ensureActive();
          asset = { eventId: event.id, selection, assetId: intent.assetId, ready: false };
          uploaded.current = asset;
        }
        if (!asset.ready) {
          update('processing', 1);
          await completePosterUpload(event.id, asset.assetId, operation.abort.signal);
          ensureActive();
          asset = { ...asset, ready: true };
          uploaded.current = asset;
        }
        update('attaching', 1);
        const result = await attachGigPoster(
          {
            eventId: event.id,
            assetId: asset.assetId,
            expectedRevision: event.posterRevision ?? 0,
          },
          operation.abort.signal,
        );
        ensureActive();
        queryClient.setQueryData(queryKeys.event(event.id), result);
        uploaded.current = null;
        update('idle', 1);
        return result;
      } catch (failure) {
        // Preserve uploaded bytes for ambiguous responses; replay completion/attachment safely.
        if (
          failure instanceof ApiError &&
          [400, 401, 403, 404, 409, 410, 413, 415, 422].includes(failure.status)
        ) {
          uploaded.current = null;
        }
        const error = operation.cancelled
          ? new PosterUploadCancelled()
          : failure instanceof Error
            ? failure
            : new Error('Unable to attach the poster. Please try again.');
        update('idle', 0, error);
        throw error;
      } finally {
        if (active.current === operation) active.current = null;
        // An interrupted response can still have committed; reconcile, do not assume rollback.
        refreshPosterQueries(queryClient, userId, event.id);
      }
    },
    [queryClient, userId],
  );

  const cancel = useCallback(async () => {
    const operation = active.current;
    if (!operation?.controller) {
      throw new Error('The poster is being processed and can no longer be cancelled.');
    }
    operation.cancelled = true;
    operation.abort.abort();
    await operation.controller.cancel();
  }, []);

  const current =
    state.userId === userId ? state : { status: 'idle' as const, progress: 0, error: null };
  return {
    upload,
    cancel,
    status: current.status,
    progress: current.progress,
    error: current.error,
    isPending: current.status !== 'idle',
  };
}
