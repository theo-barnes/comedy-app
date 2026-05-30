import { useState, useCallback, useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { AuthScreenWrapper } from '@/features/auth/AuthScreenWrapper';
import { authStyles } from '@/features/auth/authStyles';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { colors, spacing, typography } from '@/theme';
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
    <AuthScreenWrapper contentContainerStyle={{ paddingTop: spacing.xl * 1.5 }}>
      <BackButton />

      <AppText style={styles.heading}>{t('auth.forgotPassword.heading')}</AppText>
      <AppText variant="body" muted style={styles.subheading}>
        {t('auth.forgotPassword.subheading')}
      </AppText>

      {submitted ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle-outline" size={40} color={colors.primary} />
          <AppText style={styles.successTitle}>{t('auth.forgotPassword.successTitle')}</AppText>
          <AppText variant="body" muted style={styles.successBody}>
            {t('auth.forgotPassword.successBody')}
          </AppText>
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
          <AppText variant="caption" muted style={styles.label}>
            {t('auth.forgotPassword.emailLabel')}
          </AppText>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
              <>
                <TextInput
                  style={[authStyles.input, fe && authStyles.inputError]}
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
                {fe && (
                  <AppText variant="caption" style={authStyles.fieldError}>
                    {fe.message}
                  </AppText>
                )}
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
    </AuthScreenWrapper>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  subheading: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
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
    textAlign: 'center',
    lineHeight: 24,
  },
  backToSignIn: { marginTop: spacing.md },
});
