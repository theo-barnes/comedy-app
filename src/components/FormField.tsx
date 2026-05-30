import { TextInput, type TextInputProps } from 'react-native';
import type { FieldError } from 'react-hook-form';

import { AppText } from '@/components/AppText';
import { authStyles } from '@/features/auth/authStyles';
import { colors } from '@/theme';

type Props = TextInputProps & {
  label: string;
  error?: FieldError;
};

export function FormField({ label, error, style, ...inputProps }: Props) {
  return (
    <>
      <AppText variant="caption" muted style={authStyles.label}>
        {label}
      </AppText>
      <TextInput
        style={[authStyles.input, error && authStyles.inputError, style]}
        placeholderTextColor={colors.foregroundMuted}
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
