import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, router, type Href } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/features/auth/useAuth';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { colors, spacing, typography, radii } from '@/theme';
import { useTranslation } from 'react-i18next';

// Types only — schema is built inside the component so validation messages
// are always created with the active locale.
type SignInFields = { email: string; password: string };

const MAX_FAILED_ATTEMPTS = 3;
const COOLDOWN_SECONDS = 30;

export default function SignInScreen() {
  const { t } = useTranslation();
  const { signInWithEmail, signInWithGoogle, signInWithApple, continueAsGuest } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('auth.validation.emailInvalid')),
        password: z.string().min(1, t('auth.validation.passwordRequired')),
      }),
    [t],
  );
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<SignInFields>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const startCooldown = useCallback(() => {
    let remaining = COOLDOWN_SECONDS;
    setCooldownRemaining(remaining);
    const id = setInterval(() => {
      remaining -= 1;
      setCooldownRemaining(remaining);
      if (remaining <= 0) clearInterval(id);
    }, 1000);
  }, []);

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

  const handleGoogle = useCallback(async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Nav guard routes to (tabs) or (auth)/select-role based on profile state.
    } catch {
      setError(t('auth.signIn.errorGoogle'));
    } finally {
      setGoogleLoading(false);
    }
  }, [signInWithGoogle, t]);

  const handleApple = useCallback(async () => {
    setError(null);
    setAppleLoading(true);
    try {
      await signInWithApple();
      // Nav guard routes to (tabs) or (auth)/select-role based on profile state.
    } catch {
      setError(t('auth.signIn.errorApple'));
    } finally {
      setAppleLoading(false);
    }
  }, [signInWithApple, t]);

  const isThrottled = cooldownRemaining > 0;
  const submitDisabled = isSubmitting || isThrottled;

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
        {/* Logo */}
        <View style={styles.logoRow}>
          <Ionicons name="mic" size={20} color={colors.primary} />
          <AppText variant="caption" style={styles.logoText}>
            PUNCHLINE / BILLD
          </AppText>
        </View>

        <AppText style={styles.heading}>{t('auth.signIn.heading')}</AppText>
        <AppText variant="body" muted style={styles.subheading}>
          {t('auth.signIn.subheading')}
        </AppText>

        {/* Email */}
        <AppText variant="caption" muted style={styles.label}>
          {t('auth.signIn.emailLabel')}
        </AppText>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
            <>
              <TextInput
                style={[styles.input, fe && styles.inputError]}
                placeholder={t('auth.signIn.emailPlaceholder')}
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
                <AppText variant="caption" style={styles.fieldError}>
                  {fe.message}
                </AppText>
              )}
            </>
          )}
        />

        {/* Password */}
        <AppText variant="caption" muted style={styles.label}>
          {t('auth.signIn.passwordLabel')}
        </AppText>
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
            <>
              <View style={[styles.passwordRow, fe && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={colors.foregroundMuted}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="password"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
                <Pressable onPress={() => setShowPassword((p) => !p)} style={styles.eyeButton}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.foregroundMuted}
                  />
                </Pressable>
              </View>
              {fe && (
                <AppText variant="caption" style={styles.fieldError}>
                  {fe.message}
                </AppText>
              )}
            </>
          )}
        />

        <Link href={'/(auth)/forgot-password' as Href} style={styles.forgotLink}>
          {t('auth.signIn.forgotPassword')}
        </Link>

        {/* Error banner */}
        {error && (
          <AppText variant="caption" style={styles.errorBanner}>
            {error}
          </AppText>
        )}

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

        {/* OR divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <AppText variant="caption" muted>
            {t('auth.signIn.divider')}
          </AppText>
          <View style={styles.dividerLine} />
        </View>

        <Button
          variant="secondary"
          size="lg"
          onPress={handleGoogle}
          loading={googleLoading}
          style={styles.socialButton}
        >
          {t('auth.signIn.googleCta')}
        </Button>

        {Platform.OS === 'ios' && (
          <Button
            variant="secondary"
            size="lg"
            onPress={handleApple}
            loading={appleLoading}
            style={styles.socialButton}
          >
            {t('auth.signIn.appleCta')}
          </Button>
        )}

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  logoText: {
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
  },
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
    marginTop: spacing.md,
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
  inputError: {
    borderColor: '#E05C5C',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: typography.body,
    color: colors.foreground,
    backgroundColor: colors.backgroundElevated,
  },
  eyeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fieldError: {
    color: '#E05C5C',
    marginTop: 4,
  },
  forgotLink: {
    fontSize: typography.body,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'right',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  errorBanner: {
    color: '#E05C5C',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  cooldownText: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  primaryButton: { marginTop: spacing.xs },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  socialButton: {},
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  footerText: { fontSize: typography.body, color: colors.foregroundMuted },
  footerLink: { color: colors.primary, fontWeight: '700' },
  guestButton: { paddingVertical: spacing.xs },
});
