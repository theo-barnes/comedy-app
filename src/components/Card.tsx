import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type CardProps = PropsWithChildren<{ style?: ViewStyle }> &
  ({ onPress: () => void } | { onPress?: never });

export function Card({ children, onPress, style }: CardProps) {
  const styles = useThemedStyles(createStyles);
  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: radii.md,
      padding: spacing.md,
      borderWidth: 0.5,
      borderColor: theme.colors.border,
    },
    pressed: {
      opacity: 0.8,
    },
  });
