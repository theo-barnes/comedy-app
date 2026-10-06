import { useContext, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/useAuth';
import { LocationContext } from '@/features/location';
import { isApiConfigured } from '@/lib/api/client';
import { videoFeedInfiniteQueryOptions } from '@/lib/api/video-feed';

export function DiscoverFeedPrefetcher() {
  const queryClient = useQueryClient();
  const { session, profile, isLoading, isGuest } = useAuth();
  const location = useContext(LocationContext);

  useEffect(() => {
    if (!location || isLoading || isGuest || !session || !profile?.role || !isApiConfigured()) {
      return;
    }

    void queryClient.prefetchInfiniteQuery(
      videoFeedInfiniteQueryOptions(location.latitude, location.longitude),
    );
  }, [isGuest, isLoading, location, profile?.role, queryClient, session]);

  return null;
}
