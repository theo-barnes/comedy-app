import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/features/auth/useAuth';
import { DevLoginPanel } from '@/features/auth/DevLoginPanel';
import { SocialAuthButtons } from '@/features/auth/SocialAuthButtons';
import { AuthScreenWrapper } from '@/features/auth/AuthScreenWrapper';
import { LogoHeader } from '@/features/auth/LogoHeader';
import { useSocialAuthHandlers } from '@/features/auth/useSocialAuthHandlers';
import { createSignInSchema } from '@/features/auth/schemas';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { FormField } from '@/components/FormField';
import { PasswordInput } from '@/components/PasswordInput';
import { useCountdown } from '@/hooks/useCountdown';
import { colors, spacing, typography } from '@/theme';
import { useTranslation } from 'react-i18next';

// Types only — schema is built inside the component so validation messages
// are always created with the active locale.
type SignInFields = { email: string; password: string };

const MAX_FAILED_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 30;

export default function SignInScreen() {
  const { t } = useTranslation();
  const { signInWithEmail, continueAsGuest } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(() => createSignInSchema(t), [t]);
  const { handleGoogle, handleApple, googleLoading, appleLoading } = useSocialAuthHandlers({
    setError,
    googleErrorMessage: t('auth.signIn.errorGoogle'),
    appleErrorMessage: t('auth.signIn.errorApple'),
  });
  const [failedAttempts, setFailedAttempts] = useState(0);
  const { remaining: cooldownRemaining, start: startCooldown } = useCountdown(COOLDOWN_SECONDS);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignInFields>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = useCallback(
    async (data: SignInFields) => {
      setError(null);
      try {
        await signInWithEmail(data.email, data.password);
        setFailedAttempts(0);
        router.replace('/(tabs)' as Href);
      } catch {
        // Generic message — prevents email enumeration (Gap 4)
        setError(t('auth.signIn.errorInvalid'));
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= MAX_FAILED_ATTEMPTS) startCooldown();
      }
    },
    [signInWithEmail, failedAttempts, startCooldown, t],
  );

  const isThrottled = cooldownRemaining > 0;
  const submitDisabled = isSubmitting || isThrottled;

  return (
    <AuthScreenWrapper>
      <LogoHeader />

      <AppText style={styles.heading}>{t('auth.signIn.heading')}</AppText>
      <AppText variant="body" muted style={styles.subheading}>
        {t('auth.signIn.subheading')}
      </AppText>

      {/* Email */}
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
          <FormField
            label={t('auth.signIn.emailLabel')}
            placeholder={t('auth.signIn.emailPlaceholder')}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            autoComplete="email"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={fe}
          />
        )}
      />

      {/* Password */}
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
          <PasswordInput
            label={t('auth.signIn.passwordLabel')}
            placeholder="••••••••"
            textContentType="password"
            autoComplete="password"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={fe}
          />
        )}
      />

      <Link href={'/(auth)/forgot-password' as Href} style={styles.forgotLink}>
        {t('auth.signIn.forgotPassword')}
      </Link>

      <ErrorBanner message={error} />

      {/* Cooldown notice */}
      {isThrottled && (
        <AppText variant="caption" muted style={styles.cooldownText}>
          {t('auth.signIn.cooldown', { seconds: cooldownRemaining })}
        </AppText>
      )}

      <Button
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        disabled={submitDisabled}
        size="lg"
        style={styles.primaryButton}
      >
        {t('auth.signIn.submit')}
      </Button>

      <SocialAuthButtons
        onGooglePress={handleGoogle}
        onApplePress={handleApple}
        googleLoading={googleLoading}
        appleLoading={appleLoading}
      />

      {/* Footer links */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('auth.signIn.noAccount')}{' '}
          <Link href={'/(auth)/sign-up' as Href} style={styles.footerLink}>
            {t('auth.signIn.createAccount')}
          </Link>
        </Text>

        <Pressable onPress={continueAsGuest} style={styles.guestButton}>
          <AppText variant="body" muted>
            {t('auth.signIn.browseAsGuest')}
          </AppText>
        </Pressable>
      </View>

      <DevLoginPanel />
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
  forgotLink: {
    fontSize: typography.body,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  cooldownText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  primaryButton: { marginTop: spacing.xs },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  footerText: { fontSize: typography.body, color: colors.foregroundMuted },
  footerLink: { color: colors.primary, fontWeight: '700' },
  guestButton: { paddingVertical: spacing.xs },
});
