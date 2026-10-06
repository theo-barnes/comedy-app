import { apiFetch } from '@/lib/api/client';
import { fetchVideoFeedPage, videoFeedInfiniteQueryOptions } from '@/lib/api/video-feed';
import { queryKeys } from '@/lib/api/keys';

jest.mock('@/lib/api/client', () => ({
  apiFetch: jest.fn(),
  isApiConfigured: jest.fn(() => true),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('video feed API', () => {
  beforeEach(() => mockApiFetch.mockReset());

  it('requests a bounded first page with location', async () => {
    mockApiFetch.mockResolvedValue({ items: [], nextCursor: 'next-page' });

    await expect(fetchVideoFeedPage({ latitude: 51.5, longitude: -0.12 })).resolves.toEqual({
      items: [],
      nextCursor: 'next-page',
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/feed/videos',
      expect.objectContaining({
        searchParams: {
          lat: 51.5,
          lng: -0.12,
          cursor: undefined,
          limit: 10,
        },
      }),
    );
  });

  it('passes the opaque cursor without decoding it', async () => {
    mockApiFetch.mockResolvedValue({ items: [], nextCursor: null });

    await fetchVideoFeedPage({
      latitude: null,
      longitude: null,
      cursor: 'opaque-cursor',
      limit: 8,
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      '/feed/videos',
      expect.objectContaining({
        searchParams: {
          lat: undefined,
          lng: undefined,
          cursor: 'opaque-cursor',
          limit: 8,
        },
      }),
    );
  });

  it('uses the Discover cache key and first-page fetcher for infinite queries', async () => {
    mockApiFetch.mockResolvedValue({ items: [], nextCursor: null });

    const options = videoFeedInfiniteQueryOptions(51.5, -0.12);
    if (!options.queryFn) throw new Error('Video feed options must include a query function');

    const result = await options.queryFn({
      client: {} as never,
      queryKey: options.queryKey,
      signal: new AbortController().signal,
      pageParam: undefined,
      direction: 'forward',
      meta: undefined,
    });

    expect(options.queryKey).toEqual(queryKeys.videoFeed(51.5, -0.12));
    expect(options.initialPageParam).toBeUndefined();
    expect(result).toEqual({ items: [], nextCursor: null });
  });
});
