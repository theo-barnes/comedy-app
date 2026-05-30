import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { spacing } from '@/theme';

export default function SearchScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <AppText variant="heading">Search</AppText>
        <AppText muted>Search events, venues, and comedians.</AppText>
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
