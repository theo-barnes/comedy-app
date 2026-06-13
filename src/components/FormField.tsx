import { TextInput, type TextInputProps } from 'react-native';
import type { FieldError } from 'react-hook-form';

import { FieldWrapper } from '@/components/FieldWrapper';
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
    <FieldWrapper label={label} error={error}>
      <TextInput
        style={[authStyles.input, error && authStyles.inputError, style]}
        placeholderTextColor={theme.colors.textMuted}
        {...inputProps}
      />
    </FieldWrapper>
  );
}
