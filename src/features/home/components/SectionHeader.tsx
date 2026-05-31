import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, spacing } from '@/theme';

type Props = {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ label, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      {actionLabel && (
        <Pressable onPress={onAction}>
          <AppText variant="caption" style={styles.action}>
            {actionLabel}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  action: {
    color: colors.primary,
    fontWeight: '500',
  },
});
