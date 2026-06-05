import {
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

type ButtonProps = Omit<PressableProps, 'style'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  children: string;
  style?: StyleProp<ViewStyle>;
};

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
      fontSize: theme.typography.body,
    },
  });
