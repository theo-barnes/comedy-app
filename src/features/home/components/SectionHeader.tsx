import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ label, actionLabel, onAction }: Props) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    label: {
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '600',
    },
    action: {
      color: theme.colors.primaryRest,
      fontWeight: '500',
    },
  });
