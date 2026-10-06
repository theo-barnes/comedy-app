import { act, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';

import { AuthContext, type AuthContextValue } from '@/features/auth/context';
import { DiscoverFeedPrefetcher } from '@/features/discover/DiscoverFeedPrefetcher';
import { LocationContext } from '@/features/location';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';

jest.mock('@/lib/api/client', () => ({
  apiFetch: jest.fn(),
  isApiConfigured: jest.fn(() => true),
}));

const mockApiFetch = apiFetch as jest.MockedFunction<typeof apiFetch>;

const session = { user: { id: 'viewer-1' } } as Session;
const authValue: AuthContextValue = {
  session,
  user: session.user,
  profile: {
    id: session.user.id,
    display_name: 'Viewer',
    role: 'fan',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  isLoading: false,
  isGuest: false,
  signInWithEmail: jest.fn(),
  signInWithGoogle: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  continueAsGuest: jest.fn(),
  exchangeCodeForSession: jest.fn(),
  updateUserRole: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  signInAsDevRole: jest.fn(),
};

const locationValue = {
  cityLabel: null,
  latitude: null,
  longitude: null,
  permission: 'unknown' as const,
  errorCode: null,
  isLoading: false,
  requestPermissionAndResolve: jest.fn(),
  refreshLocation: jest.fn(),
  handleSetLocationPress: jest.fn(),
};

function renderPrefetcher(
  queryClient: QueryClient,
  latitude: number | null,
  longitude: number | null,
  auth: AuthContextValue = authValue,
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth}>
        <LocationContext.Provider value={{ ...locationValue, latitude, longitude }}>
          <DiscoverFeedPrefetcher />
        </LocationContext.Provider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
}

describe('DiscoverFeedPrefetcher', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockApiFetch.mockReset();
    mockApiFetch.mockResolvedValue({ items: [], nextCursor: null });
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  afterEach(() => queryClient.clear());

  it('warms the generic feed, then the resolved location feed', async () => {
    const { rerender } = renderPrefetcher(queryClient, null, null);

    await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1));
    expect(queryClient.getQueryData(queryKeys.videoFeed(null, null))).toBeDefined();

    await act(async () => {
      rerender(
        <QueryClientProvider client={queryClient}>
          <AuthContext.Provider value={authValue}>
            <LocationContext.Provider
              value={{ ...locationValue, latitude: 51.5, longitude: -0.12 }}
            >
              <DiscoverFeedPrefetcher />
            </LocationContext.Provider>
          </AuthContext.Provider>
        </QueryClientProvider>,
      );
    });

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledTimes(2);
      expect(queryClient.getQueryData(queryKeys.videoFeed(51.5, -0.12))).toBeDefined();
    });
  });

  it('does not prefetch for a guest session', async () => {
    renderPrefetcher(queryClient, null, null, { ...authValue, isGuest: true });

    await act(async () => undefined);

    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});
