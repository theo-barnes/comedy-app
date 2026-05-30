import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import type { FieldError } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { authStyles } from '@/features/auth/authStyles';
import { colors } from '@/theme';

type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'> & {
  label: string;
  error?: FieldError;
};

export function PasswordInput({ label, error, ...inputProps }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <AppText variant="caption" muted style={authStyles.label}>
        {label}
      </AppText>
      <View style={[authStyles.passwordRow, error && authStyles.inputError]}>
        <TextInput
          style={authStyles.passwordInput}
          placeholderTextColor={colors.foregroundMuted}
          secureTextEntry={!visible}
          {...inputProps}
        />
        <Pressable onPress={() => setVisible((v) => !v)} style={authStyles.eyeButton}>
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.foregroundMuted}
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
