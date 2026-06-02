import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import type { FieldError } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { createAuthStyles } from '@/features/auth/authStyles';
import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';

type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  label: string;
  error?: FieldError;
};

export function PasswordInput({ label, error, ...inputProps }: Props) {
  const [visible, setVisible] = useState(false);
  const { theme } = useTheme();
  const authStyles = useThemedStyles(createAuthStyles);

  return (
    <>
      <AppText variant="caption" muted style={authStyles.label}>
        {label}
      </AppText>
      <View style={[authStyles.passwordRow, error && authStyles.inputError]}>
        <TextInput
          style={authStyles.passwordInput}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={!visible}
          {...inputProps}
        />
        <Pressable onPress={() => setVisible((v) => !v)} style={authStyles.eyeButton}>
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.colors.textMuted}
          />
        </Pressable>
      </View>
      {error && (
        <AppText variant="caption" style={authStyles.fieldError}>
          {error.message}
        </AppText>
      )}
    </>
  );
}
