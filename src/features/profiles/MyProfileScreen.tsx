import { Screen } from '@/components/Screen';
import { StatusScreen } from '@/components/StatusScreen';
import { useAuth } from '@/features/auth/useAuth';

import { ProfileIdentity } from './ProfileIdentity';

export function MyProfileScreen() {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Screen>
        <StatusScreen icon="person-outline" title="Profile" body="Loading your profile." />
      </Screen>
    );
  }

  if (!profile?.display_name) {
    return (
      <Screen>
        <StatusScreen icon="person-outline" title="Profile" body="Your profile is unavailable." />
      </Screen>
    );
  }

  return (
    <Screen>
      <ProfileIdentity displayName={profile.display_name} />
    </Screen>
  );
}
