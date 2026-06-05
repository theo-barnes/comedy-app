import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type IconAction = {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
};

type Props = {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
  iconAction?: IconAction;
};

export function SectionHeader({ label, actionLabel, onAction, iconAction }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.container}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.actions}>
        {actionLabel && (
          <Pressable onPress={onAction}>
            <AppText variant="caption" style={styles.action}>
              {actionLabel}
            </AppText>
          </Pressable>
        )}
        {iconAction && (
          <Pressable
            onPress={iconAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={iconAction.accessibilityLabel}
            hitSlop={10}
          >
            <Ionicons name={iconAction.iconName} size={18} style={styles.iconAction} />
          </Pressable>
        )}
      </View>
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
      flex: 1,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    action: {
      color: theme.colors.primaryRest,
      fontWeight: '500',
    },
    iconAction: {
      color: theme.colors.textMuted,
    },
  });
