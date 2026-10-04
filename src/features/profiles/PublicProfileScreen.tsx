import { StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { StatusScreen } from '@/components/StatusScreen';
import { usePublicProfile } from '@/lib/api/public-profiles';
import { isApiConfigured } from '@/lib/api/client';
import { spacing } from '@/theme/tokens';

import { ProfileIdentity } from './ProfileIdentity';

type Props = {
  userId: string;
};

export function PublicProfileScreen({ userId }: Props) {
  const profileQuery = usePublicProfile(userId);

  if (!userId || !isApiConfigured()) {
    return (
      <Screen>
        <StatusScreen
          icon="cloud-offline-outline"
          title="Profile unavailable"
          body="This profile cannot be loaded right now."
        />
      </Screen>
    );
  }

  if (profileQuery.isPending) {
    return (
      <Screen>
        <View style={styles.top}>
          <BackButton />
        </View>
        <StatusScreen icon="person-outline" title="Loading profile" body="" />
      </Screen>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Screen>
        <View style={styles.top}>
          <BackButton />
        </View>
        <StatusScreen
          icon="person-outline"
          title="Profile unavailable"
          body="This profile is no longer available."
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.top}>
        <BackButton />
      </View>
      <ProfileIdentity displayName={profileQuery.data.displayName} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
});
