import { StyleSheet } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme';

export const authStyles = StyleSheet.create({
  input: {
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.body,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: '#E05C5C',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.body,
    color: colors.foreground,
    backgroundColor: colors.backgroundElevated,
  },
  eyeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fieldError: {
    color: '#E05C5C',
    marginTop: 4,
  },
});
