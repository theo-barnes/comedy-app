import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { apiSend } from '@/lib/api/client';
import { useToggleLike } from '@/lib/api/engagement';
import { queryKeys } from '@/lib/api/keys';

jest.mock('@/lib/api/client', () => ({
  apiSend: jest.fn(),
}));

const mockApiSend = apiSend as jest.MockedFunction<typeof apiSend>;

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useToggleLike', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockApiSend.mockReset();
    mockApiSend.mockResolvedValue(undefined);
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false, gcTime: 0 },
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  afterEach(() => queryClient.clear());

  it('likes and unlikes content while refreshing video-feed state', async () => {
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useToggleLike(), { wrapper: createWrapper(queryClient) });

    await act(async () => {
      await result.current.mutateAsync({ contentId: 'clip-1', liked: false });
    });

    expect(mockApiSend).toHaveBeenCalledWith('/content/clip-1/like', { method: 'POST' });
    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.videoFeedRoot }),
    );

    await act(async () => {
      await result.current.mutateAsync({ contentId: 'clip-1', liked: true });
    });

    expect(mockApiSend).toHaveBeenLastCalledWith('/content/clip-1/like', { method: 'DELETE' });
  });
});
