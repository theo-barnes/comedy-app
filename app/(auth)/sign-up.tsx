import { useState, useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/features/auth/useAuth';
import { SocialAuthButtons } from '@/features/auth/SocialAuthButtons';
import { AuthScreenWrapper } from '@/features/auth/AuthScreenWrapper';
import { LogoHeader } from '@/features/auth/LogoHeader';
import { RoleSelectionCards } from '@/features/auth/RoleSelectionCards';
import { useSocialAuthHandlers } from '@/features/auth/useSocialAuthHandlers';
import { createSignUpSchema } from '@/features/auth/schemas';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { FormField } from '@/components/FormField';
import { PasswordInput } from '@/components/PasswordInput';
import { colors, spacing, typography } from '@/theme';
import type { UserRole } from '@/types';
import { useTranslation, Trans } from 'react-i18next';

// Types only — schema built inside the component so messages use the active locale.
type SignUpFields = { displayName: string; email: string; password: string };

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('fan');
  const [error, setError] = useState<string | null>(null);

  const { handleGoogle, handleApple, googleLoading, appleLoading } = useSocialAuthHandlers({
    setError,
    googleErrorMessage: t('auth.signUp.errorGoogle'),
    appleErrorMessage: t('auth.signUp.errorApple'),
  });

  const schema = useMemo(() => createSignUpSchema(t), [t]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignUpFields>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: '', email: '', password: '' },
  });

  const onSubmit = useCallback(
    async (data: SignUpFields) => {
      setError(null);
      try {
        await signUp(data.displayName, data.email, data.password, selectedRole);
        router.replace('/(auth)/verify-email' as Href);
      } catch (err) {
        const message = err instanceof Error ? err.message : t('auth.signUp.errorFallback');
        setError(message);
      }
    },
    [signUp, selectedRole, t],
  );

  return (
    <AuthScreenWrapper>
      <BackButton />
      <LogoHeader />

      <AppText style={styles.heading}>{t('auth.signUp.heading')}</AppText>
      <AppText variant="body" muted style={styles.subheading}>
        {t('auth.signUp.subheading')}
      </AppText>

      <RoleSelectionCards selectedRole={selectedRole} onRoleChange={setSelectedRole} />

      {/* Full Name */}
      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
          <FormField
            label={t('auth.signUp.nameLabel')}
            placeholder={t('auth.signUp.namePlaceholder')}
            autoCapitalize="words"
            textContentType="name"
            autoComplete="name"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={fe}
          />
        )}
      />

      {/* Email */}
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
          <FormField
            label={t('auth.signUp.emailLabel')}
            placeholder={t('auth.signUp.emailPlaceholder')}
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
            label={t('auth.signUp.passwordLabel')}
            placeholder={t('auth.signUp.passwordPlaceholder')}
            textContentType="newPassword"
            autoComplete="new-password"
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            error={fe}
          />
        )}
      />

      <ErrorBanner message={error} />

      <Button
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        size="lg"
        style={styles.submitButton}
      >
        {t('auth.signUp.submit')}
      </Button>

      <SocialAuthButtons
        onGooglePress={handleGoogle}
        onApplePress={handleApple}
        googleLoading={googleLoading}
        appleLoading={appleLoading}
      />

      <Text style={styles.terms}>
        <Trans
          i18nKey="auth.signUp.termsAgreement"
          components={{
            termsLink: <Text style={styles.termsLink} />,
            privacyLink: <Text style={styles.termsLink} />,
          }}
        />
      </Text>

      <View style={styles.signinRow}>
        <Text style={styles.signinText}>
          {t('auth.signUp.alreadyHaveAccount')}{' '}
          <Link href={'/(auth)/sign-in' as Href} style={styles.signinLink}>
            {t('auth.signUp.signIn')}
          </Link>
        </Text>
      </View>
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
    marginBottom: spacing.lg,
  },
  submitButton: { marginTop: spacing.xl },
  terms: {
    fontSize: typography.caption,
    color: colors.foregroundMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 20,
  },
  termsLink: { color: colors.primary, fontWeight: '700' },
  signinRow: { marginTop: spacing.lg, alignItems: 'center' },
  signinText: { fontSize: typography.body, color: colors.foregroundMuted },
  signinLink: { color: colors.primary, fontWeight: '700' },
});
