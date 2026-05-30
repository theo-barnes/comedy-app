import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { spacing } from '@/theme';

export default function SavedScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <AppText variant="heading">Saved</AppText>
        <AppText muted>Your saved gigs and comedians will appear here.</AppText>
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
