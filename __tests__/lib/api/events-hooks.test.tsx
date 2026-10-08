import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

import { apiMutation } from '@/lib/api/client';
import { useCreateNativeEvent, useSaveVenueProfile } from '@/lib/api/events';
import { queryKeys } from '@/lib/api/keys';

jest.mock('@/lib/api/client', () => ({
  ...jest.requireActual('@/lib/api/client'),
  apiMutation: jest.fn(),
}));

describe('native event cache updates', () => {
  it('refreshes venue and nearby Home events after publication', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    jest.mocked(apiMutation).mockResolvedValueOnce({ id: 'event-1' });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, unmount } = renderHook(() => useCreateNativeEvent('venue-1'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        title: 'Friday comedy',
        localStartTime: '2027-02-12T20:00',
        timeZone: 'Europe/London',
      });
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.venueEvents('venue-1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.homeFeedRoot });
    unmount();
    client.clear();
  });

  it('updates creator context and refreshes public venue and Home projections', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { gcTime: 0 } } });
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const profile = { id: 'venue-1', name: 'Comedy Cellar' };
    jest.mocked(apiMutation).mockResolvedValueOnce(profile);
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, unmount } = renderHook(() => useSaveVenueProfile('venue-1'), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        name: 'Comedy Cellar',
        address: '10 High Street',
        latitude: 51.5,
        longitude: -0.1,
        bio: null,
        genres: [],
        capacity: null,
      });
    });
    expect(client.getQueryData(queryKeys.creatorProfile('venue-1'))).toEqual(profile);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.publicProfile('venue-1') });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.homeFeedRoot });
    unmount();
    client.clear();
  });
});
