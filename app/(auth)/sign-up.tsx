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
import { Link, router, type Href } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod/v3';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/features/auth/useAuth';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { colors, spacing, typography, radii } from '@/theme';
import type { UserRole } from '@/types';
import { useTranslation, Trans } from 'react-i18next';

// ─── Password policy (NIST SP 800-63B + DoS protection) ─────────────────────
// Types only — schema and role options are built inside the component
// so they use the active locale for validation messages and labels.
type SignUpFields = { displayName: string; email: string; password: string };

type RoleOption = { role: UserRole; label: string; description: string; icon: string };

export default function SignUpScreen() {
  const { t } = useTranslation();
  const { signUp, signInWithGoogle, signInWithApple } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('fan');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

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

  const roleOptions = useMemo(
    (): RoleOption[] => [
      {
        role: 'fan',
        label: t('auth.signUp.roleFanLabel'),
        description: t('auth.signUp.roleFanDescription'),
        icon: 'ticket-outline',
      },
      {
        role: 'comedian',
        label: t('auth.signUp.roleComedianLabel'),
        description: t('auth.signUp.roleComedianDescription'),
        icon: 'mic-outline',
      },
      {
        role: 'venue',
        label: t('auth.signUp.roleVenueLabel'),
        description: t('auth.signUp.roleVenueDescription'),
        icon: 'trending-up-outline',
      },
    ],
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

  const handleGoogle = useCallback(async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // Nav guard routes to (tabs) or (auth)/select-role based on profile state.
    } catch {
      setError(t('auth.signUp.errorGoogle'));
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
      setError(t('auth.signUp.errorApple'));
    } finally {
      setAppleLoading(false);
    }
  }, [signInWithApple, t]);

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
        {/* Back button */}
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>

        {/* Logo */}
        <View style={styles.logoRow}>
          <Ionicons name="mic" size={20} color={colors.primary} />
          <AppText variant="caption" style={styles.logoText}>
            PUNCHLINE / BILLD
          </AppText>
        </View>

        <AppText style={styles.heading}>{t('auth.signUp.heading')}</AppText>
        <AppText variant="body" muted style={styles.subheading}>
          {t('auth.signUp.subheading')}
        </AppText>

        {/* Role selector */}
        <View style={styles.roleContainer}>
          {roleOptions.map((opt) => {
            const isSelected = selectedRole === opt.role;
            return (
              <Pressable
                key={opt.role}
                style={[styles.roleCard, isSelected && styles.roleCardSelected]}
                onPress={() => setSelectedRole(opt.role)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={opt.label}
              >
                <View style={[styles.roleIcon, isSelected && styles.roleIconSelected]}>
                  <Ionicons
                    name={opt.icon as any}
                    size={22}
                    color={isSelected ? colors.background : colors.foregroundMuted}
                  />
                </View>
                <View style={styles.roleTextBlock}>
                  <AppText variant="body" style={styles.roleLabel}>
                    {opt.label}
                  </AppText>
                  <AppText variant="caption" muted style={styles.roleDescription}>
                    {opt.description}
                  </AppText>
                </View>
                {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>

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
                style={[styles.input, fe && styles.inputError]}
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
                <AppText variant="caption" style={styles.fieldError}>
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
                style={[styles.input, fe && styles.inputError]}
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
                <AppText variant="caption" style={styles.fieldError}>
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
              <View style={[styles.passwordRow, fe && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('auth.signUp.passwordPlaceholder')}
                  placeholderTextColor={colors.foregroundMuted}
                  secureTextEntry={!showPassword}
                  textContentType="newPassword"
                  autoComplete="new-password"
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

        {error && (
          <AppText variant="caption" style={styles.errorBanner}>
            {error}
          </AppText>
        )}

        <Button
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          size="lg"
          style={styles.submitButton}
        >
          {t('auth.signUp.submit')}
        </Button>

        {/* OR divider + social sign-in */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <AppText variant="caption" muted>
            {t('auth.signUp.divider')}
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
          {t('auth.signUp.googleCta')}
        </Button>

        {Platform.OS === 'ios' && (
          <Button
            variant="secondary"
            size="lg"
            onPress={handleApple}
            loading={appleLoading}
            style={styles.socialButton}
          >
            {t('auth.signUp.appleCta')}
          </Button>
        )}

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
  backButton: {
    marginBottom: spacing.lg,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: spacing.lg,
  },
  roleContainer: { gap: spacing.sm, marginBottom: spacing.md },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  roleCardSelected: { borderColor: colors.primary },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconSelected: { backgroundColor: colors.primary },
  roleTextBlock: { flex: 1 },
  roleLabel: { fontWeight: '700' },
  roleDescription: { marginTop: 2 },
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
  inputError: { borderColor: '#E05C5C' },
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
  eyeButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  fieldError: { color: '#E05C5C', marginTop: 4 },
  errorBanner: {
    color: '#E05C5C',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  submitButton: { marginTop: spacing.xl },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  socialButton: { marginTop: spacing.sm },
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
