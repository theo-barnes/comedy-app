import { useState, useCallback, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { colors, spacing, typography, radii } from '@/theme';
import { useTranslation } from 'react-i18next';

// Type only — schema built inside the component so messages use the active locale.
type ForgotFields = { email: string };

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  // Always show the same success message regardless of whether the email exists —
  // prevents email enumeration (Gap 4 mitigation).
  const [submitted, setSubmitted] = useState(false);

  const schema = useMemo(
    () => z.object({ email: z.string().email(t('auth.validation.emailInvalid')) }),
    [t],
  );

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotFields>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = useCallback(async (data: ForgotFields) => {
    // Fire and discard the result — we show the same success message either way.
    await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: 'billd-tonight://auth-callback',
    });
    setSubmitted(true);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>

        <Text style={styles.heading}>{t('auth.forgotPassword.heading')}</Text>
        <Text style={styles.subheading}>{t('auth.forgotPassword.subheading')}</Text>

        {submitted ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle-outline" size={40} color={colors.primary} />
            <Text style={styles.successTitle}>{t('auth.forgotPassword.successTitle')}</Text>
            <Text style={styles.successBody}>{t('auth.forgotPassword.successBody')}</Text>
            <Button
              variant="secondary"
              size="md"
              onPress={() => router.back()}
              style={styles.backToSignIn}
            >
              {t('auth.forgotPassword.backToSignIn')}
            </Button>
          </View>
        ) : (
          <>
            <Text style={styles.label}>{t('auth.forgotPassword.emailLabel')}</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
                <>
                  <TextInput
                    style={[styles.input, fe && styles.inputError]}
                    placeholder={t('auth.forgotPassword.emailPlaceholder')}
                    placeholderTextColor={colors.foregroundMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  {fe && <Text style={styles.fieldError}>{fe.message}</Text>}
                </>
              )}
            />

            <Button
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              size="lg"
              style={styles.submitButton}
            >
              {t('auth.forgotPassword.submit')}
            </Button>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.xl,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  subheading: {
    fontSize: typography.body,
    color: colors.foregroundMuted,
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.foregroundMuted,
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
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
  inputError: { borderColor: '#E05C5C' },
  fieldError: { fontSize: typography.caption, color: '#E05C5C', marginTop: 4 },
  submitButton: { marginTop: spacing.xl },
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  successTitle: {
    fontSize: typography.heading,
    fontWeight: '700',
    color: colors.foreground,
    textAlign: 'center',
  },
  successBody: {
    fontSize: typography.body,
    color: colors.foregroundMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  backToSignIn: { marginTop: spacing.md },
});
