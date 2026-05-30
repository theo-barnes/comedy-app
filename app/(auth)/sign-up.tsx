import { useState, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/features/auth/useAuth';
import { SocialAuthButtons } from '@/features/auth/SocialAuthButtons';
import { AuthScreenWrapper } from '@/features/auth/AuthScreenWrapper';
import { LogoHeader } from '@/features/auth/LogoHeader';
import { RoleSelectionCards } from '@/features/auth/RoleSelectionCards';
import { useSocialAuthHandlers } from '@/features/auth/useSocialAuthHandlers';
import { authStyles } from '@/features/auth/authStyles';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
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
  const [showPassword, setShowPassword] = useState(false);

  const { handleGoogle, handleApple, googleLoading, appleLoading } = useSocialAuthHandlers({
    setError,
    googleErrorMessage: t('auth.signUp.errorGoogle'),
    appleErrorMessage: t('auth.signUp.errorApple'),
  });

  const schema = useMemo(
    () =>
      z.object({
        displayName: z.string().min(1, t('auth.validation.nameRequired')).max(100),
        email: z.string().email(t('auth.validation.emailInvalid')),
        password: z
          .string()
          .min(8, t('auth.validation.passwordMin'))
          .max(128, t('auth.validation.passwordMax'))
          .regex(/[^0-9]/, t('auth.validation.passwordNonNumeric')),
      }),
    [t],
  );

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
      <AppText variant="caption" muted style={styles.label}>
        {t('auth.signUp.nameLabel')}
      </AppText>
      <Controller
        control={control}
        name="displayName"
        render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
          <>
            <TextInput
              style={[authStyles.input, fe && authStyles.inputError]}
              placeholder={t('auth.signUp.namePlaceholder')}
              placeholderTextColor={colors.foregroundMuted}
              autoCapitalize="words"
              textContentType="name"
              autoComplete="name"
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

      {/* Email */}
      <AppText variant="caption" muted style={styles.label}>
        {t('auth.signUp.emailLabel')}
      </AppText>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
          <>
            <TextInput
              style={[authStyles.input, fe && authStyles.inputError]}
              placeholder={t('auth.signUp.emailPlaceholder')}
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

      {/* Password */}
      <AppText variant="caption" muted style={styles.label}>
        {t('auth.signUp.passwordLabel')}
      </AppText>
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
          <>
            <View style={[authStyles.passwordRow, fe && authStyles.inputError]}>
              <TextInput
                style={authStyles.passwordInput}
                placeholder={t('auth.signUp.passwordPlaceholder')}
                placeholderTextColor={colors.foregroundMuted}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                autoComplete="new-password"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
              <Pressable onPress={() => setShowPassword((p) => !p)} style={authStyles.eyeButton}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.foregroundMuted}
                />
              </Pressable>
            </View>
            {fe && (
              <AppText variant="caption" style={authStyles.fieldError}>
                {fe.message}
              </AppText>
            )}
          </>
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
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
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
