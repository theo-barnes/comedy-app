import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme/types';
import { radii, spacing, typography } from '@/theme/tokens';

export const createAuthStyles = (theme: Theme) =>
  StyleSheet.create({
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      fontSize: typography.body,
      color: theme.colors.textPrimary,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    inputError: {
      borderColor: theme.colors.errorBorder,
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      fontSize: typography.body,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.card,
    },
    eyeButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    fieldError: {
      color: theme.colors.errorInk,
      marginTop: 4,
    },
    label: {
      fontSize: 11,
      fontWeight: '700' as const,
      letterSpacing: 1,
      marginBottom: spacing.xs,
      marginTop: spacing.md,
    },
  });
