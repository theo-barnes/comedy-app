import { ApiError, apiFetch, apiMutation } from '@/lib/api/client';
import {
  attachGigPoster,
  completePosterUpload,
  createPosterUpload,
  fetchPosterConfig,
  publishGig,
} from '@/lib/api/gig-posters';
import * as gigPosters from '@/lib/api/gig-posters';

jest.mock('@/lib/api/client', () => ({
  ...jest.requireActual('@/lib/api/client'),
  apiFetch: jest.fn(),
  apiMutation: jest.fn(),
}));

describe('required gig image contracts', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([404, 503])(
    'propagates configuration HTTP %s instead of optional-image fallback',
    async (status) => {
      jest.mocked(apiFetch).mockRejectedValueOnce(new ApiError('Media unavailable', status));
      await expect(fetchPosterConfig()).rejects.toMatchObject({ status });
    },
  );

  it('accepts configuration without enabled and strips the obsolete product switch', async () => {
    const config = {
      maxBytes: 1000,
      maxPixels: 10000,
      supportedContentTypes: ['image/jpeg'],
    };
    jest
      .mocked(apiFetch)
      .mockImplementationOnce(async (_path, options) =>
        options!.schema!.parse({ ...config, enabled: false }),
      );
    await expect(fetchPosterConfig()).resolves.toEqual(config);
    expect(apiFetch).toHaveBeenCalledWith('/events/poster-config', { schema: expect.anything() });
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
      { method: 'POST', body: {}, schema: expect.anything(), signal: abort.signal },
    );
  });

  it('publishes a prepared asset atomically with the expected draft revision', async () => {
    const abort = new AbortController();
    await publishGig({ eventId: 'event/1', assetId: 'asset-1', expectedRevision: 3 }, abort.signal);
    expect(apiMutation).toHaveBeenLastCalledWith('/events/event%2F1/publish', {
      method: 'POST',
      body: { assetId: 'asset-1', expectedRevision: 3 },
      schema: expect.anything(),
      signal: abort.signal,
    });
  });

  it('replaces a published image with an asset and revision, not a client URL', async () => {
    await attachGigPoster({ eventId: 'event-1', assetId: 'asset-1', expectedRevision: 3 });
    expect(apiMutation).toHaveBeenLastCalledWith('/events/event-1/poster', {
      method: 'PUT',
      body: { assetId: 'asset-1', expectedRevision: 3 },
      schema: expect.anything(),
      signal: undefined,
    });
  });

  it.each([publishGig, attachGigPoster])(
    'rejects private or image-less success responses at finalization: %p',
    async (finalize) => {
      const event = {
        id: 'event-1',
        venueId: 'venue-1',
        title: 'Comedy',
        startTime: '2027-02-12T20:00:00Z',
        status: 'scheduled',
        comedianIds: [],
        publicationStatus: 'published',
        posterUrl: 'https://posters.test/ready.jpg',
        posterWidth: 600,
        posterHeight: 900,
      };
      jest
        .mocked(apiMutation)
        .mockImplementation(async (_path, options) => options.schema!.parse(event));
      await expect(
        finalize({ eventId: event.id, assetId: 'asset-1', expectedRevision: 0 }),
      ).resolves.toEqual(event);
      jest
        .mocked(apiMutation)
        .mockImplementationOnce(async (_path, options) =>
          options.schema!.parse({ ...event, publicationStatus: 'draft' }),
        );
      await expect(
        finalize({ eventId: event.id, assetId: 'asset-1', expectedRevision: 0 }),
      ).rejects.toThrow();
      jest
        .mocked(apiMutation)
        .mockImplementationOnce(async (_path, options) =>
          options.schema!.parse({ ...event, posterUrl: null }),
        );
      await expect(
        finalize({ eventId: event.id, assetId: 'asset-1', expectedRevision: 0 }),
      ).rejects.toThrow();
    },
  );

  it('does not expose a client operation to remove a published gig sole image', () => {
    expect(gigPosters).not.toHaveProperty('removeGigPoster');
    expect(gigPosters).not.toHaveProperty('useRemoveGigPoster');
  });
});
