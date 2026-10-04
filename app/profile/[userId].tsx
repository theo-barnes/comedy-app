import { useLocalSearchParams } from 'expo-router';

import { PublicProfileScreen } from '@/features/profiles';

export default function PublicProfileRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <PublicProfileScreen userId={userId ?? ''} />;
}
