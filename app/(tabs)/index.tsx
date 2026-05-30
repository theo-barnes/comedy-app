import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { spacing } from '@/theme';

export default function HomeScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <AppText variant="title">Comedy nights</AppText>
        <AppText muted>Discover nearby comedy events, lineups, and performer clips.</AppText>
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
