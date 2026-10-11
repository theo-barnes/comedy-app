import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { useGigPosterUpload, type PosterSelection } from '@/features/events/poster-upload';
import { createTusPosterUpload, PosterUploadCancelled } from '@/features/events/poster-tus-upload';
import type { VenueEvent } from '@/lib/api/events';
import {
  attachGigPoster,
  completePosterUpload,
  createPosterUpload,
  publishGig,
} from '@/lib/api/gig-posters';
import { queryKeys } from '@/lib/api/keys';
import { ApiError } from '@/lib/api/client';

jest.mock('@/features/events/poster-tus-upload', () => ({
  ...jest.requireActual('@/features/events/poster-tus-upload'),
  createTusPosterUpload: jest.fn(),
}));
jest.mock('@/lib/api/gig-posters', () => ({
  ...jest.requireActual('@/lib/api/gig-posters'),
  createPosterUpload: jest.fn(),
  completePosterUpload: jest.fn(),
  attachGigPoster: jest.fn(),
  publishGig: jest.fn(),
}));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));
jest.mock('tus-js-client', () => ({ Upload: jest.fn() }));

const event: VenueEvent = {
  id: 'event-1',
  venueId: 'venue-1',
  title: 'Friday comedy',
  startTime: '2027-02-12T20:00:00Z',
  status: 'scheduled',
  publicationStatus: 'published',
  comedianIds: [],
  posterRevision: 2,
  posterUrl: 'https://storage.example.com/old.png',
  posterWidth: 600,
  posterHeight: 900,
};
const selection: PosterSelection = {
  uri: 'file:///poster.png',
  fileSize: 1000,
  contentType: 'image/png',
  width: 600,
  height: 900,
};
const intent = {
  assetId: 'asset-1',
  uploadUrl: 'https://project.storage.supabase.co/storage/v1/upload/resumable/sign',
  uploadToken: 'upload-token',
  bucketName: 'gig-poster-originals',
  objectName: 'uploads/asset-1',
};
const updated = { ...event, posterRevision: 3, posterUrl: 'https://storage.example.com/new.png' };

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: 0 } },
  });
  client.setQueryData(queryKeys.event(event.id), event);
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useGigPosterUpload('venue-1'), { wrapper });
  return { ...hook, client, invalidate };
}

describe('gig poster upload orchestration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createPosterUpload).mockResolvedValue(intent);
    jest.mocked(createTusPosterUpload).mockReturnValue({
      start: jest.fn(),
      cancel: jest.fn().mockResolvedValue(undefined),
      completed: Promise.resolve(),
    });
    jest.mocked(completePosterUpload).mockResolvedValue({
      assetId: 'asset-1',
      status: 'ready',
      width: 600,
      height: 900,
    });
    jest.mocked(attachGigPoster).mockResolvedValue(updated);
    jest.mocked(publishGig).mockResolvedValue(updated);
  });

  it('waits for private processing before attaching with the current revision', async () => {
    const { result, client, invalidate, unmount } = setup();
    await act(async () => {
      await expect(result.current.upload(event, selection)).resolves.toEqual(updated);
    });
    expect(createPosterUpload).toHaveBeenCalledWith(
      'event-1',
      { contentType: 'image/png', fileSize: 1000 },
      expect.anything(),
    );
    expect(completePosterUpload).toHaveBeenCalledWith('event-1', 'asset-1', expect.anything());
    expect(attachGigPoster).toHaveBeenCalledWith(
      { eventId: 'event-1', assetId: 'asset-1', expectedRevision: 2 },
      expect.anything(),
    );
    expect(publishGig).not.toHaveBeenCalled();
    const processed = jest.mocked(completePosterUpload).mock.invocationCallOrder[0];
    const attached = jest.mocked(attachGigPoster).mock.invocationCallOrder[0];
    if (processed === undefined || attached === undefined)
      throw new Error('Expected both operations');
    expect(processed).toBeLessThan(attached);
    expect(client.getQueryData(queryKeys.event(event.id))).toEqual(updated);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.homeFeedRoot });
    expect(result.current.isPending).toBe(false);
    unmount();
    client.clear();
  });

  it('publishes a draft only after private processing, never using the published replacement endpoint', async () => {
    const draft: VenueEvent = { ...event, publicationStatus: 'draft', posterUrl: null };
    const { result, client, unmount } = setup();
    await act(async () => {
      await expect(result.current.upload(draft, selection)).resolves.toEqual(updated);
    });
    expect(publishGig).toHaveBeenCalledWith(
      { eventId: draft.id, assetId: 'asset-1', expectedRevision: 2 },
      expect.anything(),
    );
    expect(jest.mocked(completePosterUpload).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(publishGig).mock.invocationCallOrder[0]!,
    );
    expect(attachGigPoster).not.toHaveBeenCalled();
    expect(client.getQueryData(queryKeys.event(draft.id))).toEqual(updated);
    unmount();
    client.clear();
  });

  it('does not publish a draft when image processing fails', async () => {
    jest.mocked(completePosterUpload).mockRejectedValueOnce(new Error('Malformed image'));
    const draft: VenueEvent = { ...event, publicationStatus: 'draft', posterUrl: null };
    const { result, client, unmount } = setup();
    client.setQueryData(queryKeys.event(draft.id), draft);
    await act(async () => {
      await expect(result.current.upload(draft, selection)).rejects.toThrow('Malformed image');
    });
    expect(publishGig).not.toHaveBeenCalled();
    expect(attachGigPoster).not.toHaveBeenCalled();
    expect(client.getQueryData(queryKeys.event(draft.id))).toEqual(draft);
    unmount();
    client.clear();
  });

  it('keeps the old poster after decoding failure and does not attach unchecked bytes', async () => {
    jest.mocked(completePosterUpload).mockRejectedValueOnce(new Error('Malformed image'));
    const { result, client, unmount } = setup();
    await act(async () => {
      await expect(result.current.upload(event, selection)).rejects.toThrow('Malformed image');
    });
    expect(attachGigPoster).not.toHaveBeenCalled();
    expect(client.getQueryData(queryKeys.event(event.id))).toEqual(event);
    expect(result.current.error?.message).toBe('Malformed image');
    expect(result.current.isPending).toBe(false);
    unmount();
    client.clear();
  });

  it('blocks duplicate upload presses synchronously', async () => {
    const { result, client, unmount } = setup();
    await act(async () => {
      const first = result.current.upload(event, selection);
      await expect(result.current.upload(event, selection)).rejects.toThrow('already running');
      await first;
    });

    expect(createPosterUpload).toHaveBeenCalledTimes(1);
    unmount();
    client.clear();
  });

  it('replays the same attachment after a lost response rather than uploading a conflicting asset', async () => {
    let attachedAsset: string | null = null;
    jest.mocked(attachGigPoster).mockImplementation(async (input) => {
      if (attachedAsset === input.assetId) return updated;
      if (attachedAsset) throw new ApiError('Revision conflict', 409);
      attachedAsset = input.assetId;
      throw new TypeError('Network response was lost after commit');
    });
    const { result, client, unmount } = setup();
    await act(async () => {
      await expect(result.current.upload(event, selection)).rejects.toThrow('response was lost');
    });
    await act(async () => {
      await expect(result.current.upload(event, selection)).resolves.toEqual(updated);
    });
    expect(createPosterUpload).toHaveBeenCalledTimes(1);
    expect(completePosterUpload).toHaveBeenCalledTimes(1);
    expect(attachGigPoster).toHaveBeenCalledTimes(2);
    unmount();
    client.clear();
  });

  it('replays draft publication with the same processed asset after an ambiguous finalization response', async () => {
    const draft: VenueEvent = {
      ...event,
      publicationStatus: 'draft',
      posterUrl: null,
      posterWidth: null,
      posterHeight: null,
    };
    jest
      .mocked(publishGig)
      .mockRejectedValueOnce(new TypeError('Publication response lost'))
      .mockResolvedValueOnce(updated);
    const { result, client, unmount } = setup();
    client.setQueryData(queryKeys.event(draft.id), draft);
    await act(async () => {
      await expect(result.current.upload(draft, selection)).rejects.toThrow('response lost');
    });
    expect(client.getQueryData(queryKeys.event(draft.id))).toEqual(draft);
    await act(async () => {
      await expect(result.current.upload(draft, selection)).resolves.toEqual(updated);
    });
    expect(createPosterUpload).toHaveBeenCalledTimes(1);
    expect(completePosterUpload).toHaveBeenCalledTimes(1);
    expect(publishGig).toHaveBeenCalledTimes(2);
    expect(jest.mocked(publishGig).mock.calls[0]?.[0]).toEqual(
      jest.mocked(publishGig).mock.calls[1]?.[0],
    );
    expect(attachGigPoster).not.toHaveBeenCalled();
    unmount();
    client.clear();
  });

  it('rejects a different venue before issuing a storage capability', async () => {
    const { result, client, unmount } = setup();
    await expect(
      result.current.upload({ ...event, venueId: 'other-venue' }, selection),
    ).rejects.toThrow('own gigs');
    expect(createPosterUpload).not.toHaveBeenCalled();
    unmount();
    client.clear();
  });

  it('cancels an active upload without proceeding to processing or publication', async () => {
    let reject: (error: Error) => void;
    const completed = new Promise<void>((_resolve, rejectPromise) => {
      reject = rejectPromise;
    });
    const cancel = jest.fn(async () => reject(new PosterUploadCancelled()));
    jest.mocked(createTusPosterUpload).mockReturnValue({
      start: jest.fn(),
      cancel,
      completed,
    });
    const { result, client, unmount } = setup();
    const requests: Promise<VenueEvent>[] = [];
    act(() => {
      requests.push(result.current.upload(event, selection));
    });
    const rejected = expect(requests[0]).rejects.toMatchObject({ name: 'PosterUploadCancelled' });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.cancel();
      await rejected;
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(completePosterUpload).not.toHaveBeenCalled();
    expect(attachGigPoster).not.toHaveBeenCalled();
    unmount();
    client.clear();
  });

  it('does not continue publication after navigation while an intent was in flight', async () => {
    let finishIntent: (value: typeof intent) => void;
    jest.mocked(createPosterUpload).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishIntent = resolve;
        }),
    );
    const { result, client, unmount } = setup();
    const requests: Promise<VenueEvent>[] = [];
    act(() => {
      requests.push(result.current.upload(event, selection));
    });
    const rejected = expect(requests[0]).rejects.toMatchObject({ name: 'PosterUploadCancelled' });
    unmount();
    await act(async () => {
      finishIntent(intent);
      await rejected;
    });
    expect(createTusPosterUpload).not.toHaveBeenCalled();
    expect(attachGigPoster).not.toHaveBeenCalled();
    client.clear();
  });
});
