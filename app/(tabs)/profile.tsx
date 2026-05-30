import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { spacing } from '@/theme';

export default function ProfileScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <AppText variant="heading">Profile</AppText>
        <AppText muted>Account, comedian tools, and settings.</AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
