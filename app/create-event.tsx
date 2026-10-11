import { useLocalSearchParams } from 'expo-router';

import { CreateEventScreen } from '@/features/events/CreateEventScreen';

export default function CreateEventRoute() {
  const { draftId } = useLocalSearchParams<{ draftId?: string | string[] }>();
  const id = typeof draftId === 'string' && draftId.trim() ? draftId : undefined;
  return <CreateEventScreen draftId={id} invalidDraftId={draftId !== undefined && !id} />;
}
