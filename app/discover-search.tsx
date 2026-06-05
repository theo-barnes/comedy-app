import { useRouter } from 'expo-router';

import { StatusScreen } from '@/components/StatusScreen';

export default function DiscoverSearchScreen() {
  const router = useRouter();

  return (
    <StatusScreen
      icon="search-outline"
      title="Search"
      body="Search is being integrated."
      cta={{
        label: 'Go back',
        onPress: () => router.back(),
      }}
    />
  );
}
