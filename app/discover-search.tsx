import { useMemo } from 'react';

import { useLocalSearchParams, useRouter } from 'expo-router';

import { StatusScreen } from '@/components/StatusScreen';

function resolveContextLabel(context: string | string[] | undefined) {
  const value = Array.isArray(context) ? context[0] : context;

  if (value === 'map-filter') return 'Map filters';
  if (value === 'browse') return 'Browse';
  if (value === 'clips') return 'Clips';
  if (value === 'map') return 'Map';
  return 'Discover';
}

export default function DiscoverSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ context?: string | string[] }>();

  const contextLabel = useMemo(() => resolveContextLabel(params.context), [params.context]);

  return (
    <StatusScreen
      icon="search-outline"
      title={`Search ${contextLabel}`}
      body="Search is being integrated into the Discover action bar flow."
      cta={{
        label: 'Back to Discover',
        onPress: () => router.back(),
      }}
    />
  );
}
