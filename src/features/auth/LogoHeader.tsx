import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { colors, spacing } from '@/theme';

export function LogoHeader() {
  return (
    <View style={styles.row}>
      <Ionicons name="mic" size={20} color={colors.primary} />
      <AppText variant="caption" style={styles.text}>
        PUNCHLINE / BILLD
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  text: {
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
  },
});
