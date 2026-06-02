import { TextInput, type TextInputProps } from 'react-native';
import type { FieldError } from 'react-hook-form';

import { AppText } from '@/components/AppText';
import { createAuthStyles } from '@/features/auth/authStyles';
import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';

type Props = TextInputProps & {
  label: string;
  error?: FieldError;
};

export function FormField({ label, error, style, ...inputProps }: Props) {
  const { theme } = useTheme();
  const authStyles = useThemedStyles(createAuthStyles);
  return (
    <>
      <AppText variant="caption" muted style={authStyles.label}>
        {label}
      </AppText>
      <TextInput
        style={[authStyles.input, error && authStyles.inputError, style]}
        placeholderTextColor={theme.colors.textMuted}
        {...inputProps}
      />
      {error && (
        <AppText variant="caption" style={authStyles.fieldError}>
          {error.message}
        </AppText>
      )}
    </>
  );
}
