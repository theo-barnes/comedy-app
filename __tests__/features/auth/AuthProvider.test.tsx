import { act, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import { View } from 'react-native';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { queryKeys } from '@/lib/api/keys';
import { fetchProfile } from '@/lib/api/profiles';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock('@/lib/api/profiles', () => ({
  fetchProfile: jest.fn(),
  updateProfileRole: jest.fn(),
}));

const mockGetSession = supabase.auth.getSession as jest.MockedFunction<
  typeof supabase.auth.getSession
>;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.MockedFunction<
  typeof supabase.auth.onAuthStateChange
>;
const mockFetchProfile = fetchProfile as jest.MockedFunction<typeof fetchProfile>;

const session = { user: { id: 'viewer-1' } } as Session;

describe('AuthProvider', () => {
  let queryClient: QueryClient;
  let authStateCallback: Parameters<typeof supabase.auth.onAuthStateChange>[0] | undefined;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockFetchProfile.mockResolvedValue({
      id: session.user.id,
      display_name: 'Viewer',
      role: 'fan',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: { subscription: { unsubscribe: jest.fn() } },
      } as unknown as ReturnType<typeof supabase.auth.onAuthStateChange>;
    });
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  it('clears viewer-specific video feed data when the user signs out', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <View />
        </AuthProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => expect(mockFetchProfile).toHaveBeenCalledWith(session.user.id));
    queryClient.setQueryData(queryKeys.videoFeed(null, null), {
      pages: [{ items: [] }],
      pageParams: [],
    });

    await act(async () => {
      authStateCallback?.('SIGNED_OUT', null);
    });

    expect(queryClient.getQueryData(queryKeys.videoFeed(null, null))).toBeUndefined();
  });
});
