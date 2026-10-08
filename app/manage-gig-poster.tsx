import { useLocalSearchParams } from 'expo-router';

import { ManageGigPosterScreen } from '@/features/events/ManageGigPosterScreen';

export default function ManageGigPosterRoute() {
  const { eventId } = useLocalSearchParams<{ eventId?: string | string[] }>();
  return (
    <ManageGigPosterScreen
      eventId={typeof eventId === 'string' && eventId.trim() ? eventId : undefined}
    />
  );
}
