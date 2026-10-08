import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { ApiError, apiFetch, apiMutation } from '@/lib/api/client';
import { eventSchema } from '@/lib/api/events';
import {
  attachGigPoster,
  completePosterUpload,
  createPosterUpload,
  fetchPosterConfig,
  useRemoveGigPoster,
} from '@/lib/api/gig-posters';
import { queryKeys } from '@/lib/api/keys';

jest.mock('@/lib/api/client', () => ({
  ...jest.requireActual('@/lib/api/client'),
  apiFetch: jest.fn(),
  apiMutation: jest.fn(),
}));

describe('gig poster contracts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('only recognizes old-backend 404 as an unavailable capability', async () => {
    jest.mocked(apiFetch).mockRejectedValueOnce(new ApiError('Missing route', 404));
    await expect(fetchPosterConfig()).resolves.toBeNull();
    jest.mocked(apiFetch).mockRejectedValueOnce(new ApiError('Unavailable', 503));
    await expect(fetchPosterConfig()).rejects.toMatchObject({ status: 503 });
  });

  it('binds upload and completion to the event without sending an original URL', async () => {
    const abort = new AbortController();
    await createPosterUpload('event-1', { contentType: 'image/png', fileSize: 1000 }, abort.signal);
    expect(apiMutation).toHaveBeenLastCalledWith('/events/event-1/poster/uploads', {
      method: 'POST',
      body: { contentType: 'image/png', fileSize: 1000 },
      schema: expect.anything(),
      signal: abort.signal,
    });
    await completePosterUpload('event-1', 'asset-1', abort.signal);
    expect(apiMutation).toHaveBeenLastCalledWith(
      '/events/event-1/poster/uploads/asset-1/complete',
      {
        method: 'POST',
        body: {},
        schema: expect.anything(),
        signal: abort.signal,
      },
    );
  });

  it('attaches an asset with the expected revision, not a client image URL', async () => {
    await attachGigPoster({ eventId: 'event-1', assetId: 'asset-1', expectedRevision: 3 });
    expect(apiMutation).toHaveBeenLastCalledWith('/events/event-1/poster', {
      method: 'PUT',
      body: { assetId: 'asset-1', expectedRevision: 3 },
      schema: eventSchema,
      signal: undefined,
    });
  });

  it('updates the current event and refreshes all affected read projections on removal', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const event = { id: 'event-1', posterUrl: null, posterRevision: 4 };
    jest.mocked(apiMutation).mockResolvedValueOnce(event);
    const { result, unmount } = renderHook(() => useRemoveGigPoster('venue-1'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ eventId: 'event-1', expectedRevision: 3 });
    });
    expect(client.getQueryData(queryKeys.event('event-1'))).toEqual(event);
    for (const queryKey of [
      queryKeys.event('event-1'),
      queryKeys.venueEvents('venue-1'),
      queryKeys.homeFeedRoot,
      queryKeys.videoFeedRoot,
    ]) {
      expect(invalidate).toHaveBeenCalledWith({ queryKey });
    }
    expect(apiMutation).toHaveBeenLastCalledWith('/events/event-1/poster', {
      method: 'DELETE',
      body: { expectedRevision: 3 },
      schema: eventSchema,
    });
    unmount();
    client.clear();
  });

  it('reconciles a failed removal without discarding the previous cached poster', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });
    const previous = { id: 'event-1', posterUrl: 'https://storage.example.com/old.jpg' };
    client.setQueryData(queryKeys.event('event-1'), previous);
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    jest.mocked(apiMutation).mockRejectedValueOnce(new ApiError('Revision conflict', 409));
    const { result, unmount } = renderHook(() => useRemoveGigPoster('venue-1'), { wrapper });
    await act(async () => {
      await expect(
        result.current.mutateAsync({ eventId: 'event-1', expectedRevision: 2 }),
      ).rejects.toMatchObject({ status: 409 });
    });
    expect(client.getQueryData(queryKeys.event('event-1'))).toEqual(previous);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.event('event-1') });
    unmount();
    client.clear();
  });
});
