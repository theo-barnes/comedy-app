import {
  // React Native components and types
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { type ReactNode } from 'react';

import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button component is a customizable button that supports different variants, sizes, loading states, and icons.
 * It uses the Pressable component from React Native to handle press interactions and provides visual feedback for pressed and disabled states.
 *
 * @param variant - The visual style of the button ('primary', 'secondary', or 'ghost').
 * @param size - The size of the button ('sm', 'md', or 'lg').
 * @param loading - If true, displays a loading indicator instead of the button content.
 * @param disabled - If true, disables the button and applies a disabled style.
 * @param icon - Optional icon to display alongside the button text.
 * @param children - The text content of the button.
 * @param style - Optional style to apply to the button container.
 * @param props - Other PressableProps to pass to the underlying Pressable component.
 *
 * @returns A React element representing the button.
 */
type ButtonProps = Omit<PressableProps, 'style'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Exported Button component that renders a pressable button with customizable styles, sizes, and states.
 * It uses the useTheme and useThemedStyles hooks to apply theme-based styles and resolve font families based on the provided variant and font weight.
 *
 * @param param0 - The properties for the Button component, including variant, size, loading, disabled, icon, children, style, and other PressableProps.
 * @returns A React element representing the button.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  icon,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[size],
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? theme.colors.onPrimary : theme.colors.primaryRest}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, styles[`${variant}Label`], styles[`${size}Label`]]}>
            {children}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.sm,
      flexDirection: 'row',
      gap: spacing.sm,
    },
    disabled: {
      opacity: 0.45,
    },
    pressed: {
      opacity: 0.75,
    },

    // Variants
    primary: {
      backgroundColor: theme.colors.primaryRest,
    },
    secondary: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    ghost: {
      backgroundColor: 'transparent',
    },

    // Sizes
    sm: {
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.md,
      minHeight: 36,
    },
    md: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      minHeight: 44,
    },
    lg: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      minHeight: 52,
    },

    // Labels
    label: {
      fontWeight: '600',
      fontFamily: theme.typography.fontFamily.roles.button,
    },
    primaryLabel: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.body,
    },
    secondaryLabel: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.body,
    },
    ghostLabel: {
      color: theme.colors.primaryRest,
      fontSize: theme.typography.body,
    },
    smLabel: {
      fontSize: theme.typography.caption,
    },
    mdLabel: {
      fontSize: theme.typography.body,
    },
    lgLabel: {
      fontSize: theme.typography.subheading,
    },
  });
