import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

/**
 * Card component is a versatile container that can be either pressable or static, depending on the presence of an onPress prop.
 * It provides a styled card layout with customizable styles and supports children elements.
 *
 * @param param0 - The properties for the Card component, including children, onPress, and style.
 * @returns A React element representing the card.
 */
type CardProps = PropsWithChildren<{ style?: ViewStyle }> &
  ({ onPress: () => void } | { onPress?: never });

/**
 * Exported Card component that renders a pressable or static card container with customizable styles.
 * It uses the useThemedStyles hook to apply theme-based styles and provides visual feedback for pressed states.
 *
 * @param children - The content to be displayed inside the card.
 * @param onPress - Optional callback function to be called when the card is pressed. If provided, the card becomes pressable.
 * @param style - Optional style to apply to the card container.
 *
 * @returns A React element representing the card.
 */
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
