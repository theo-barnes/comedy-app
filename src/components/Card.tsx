import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, spacing } from '@/theme';

type CardProps = PropsWithChildren<{ style?: ViewStyle }> &
  ({ onPress: () => void } | { onPress?: never });

export function Card({ children, onPress, style }: CardProps) {
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.8,
  },
});
