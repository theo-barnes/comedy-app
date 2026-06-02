import { useState, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAuth } from '@/features/auth/useAuth';
import { createForgotSchema } from '@/features/auth/schemas';
import { AuthScreenWrapper } from '@/features/auth/AuthScreenWrapper';
import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Button } from '@/components/Button';
import { FormField } from '@/components/FormField';
import { StatusScreen } from '@/components/StatusScreen';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';
import { useTranslation } from 'react-i18next';

// Type only — schema built inside the component so messages use the active locale.
type ForgotFields = { email: string };

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { resetPasswordForEmail } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const styles = useThemedStyles(createStyles);

  const schema = useMemo(() => createForgotSchema(t), [t]);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ForgotFields>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = useCallback(
    async (data: ForgotFields) => {
      await resetPasswordForEmail(data.email);
      setSubmitted(true);
    },
    [resetPasswordForEmail],
  );

  return (
    <AuthScreenWrapper contentContainerStyle={{ paddingTop: spacing.xl * 1.5 }}>
      <BackButton />

      <AppText style={styles.heading}>{t('auth.forgotPassword.heading')}</AppText>
      <AppText variant="body" muted style={styles.subheading}>
        {t('auth.forgotPassword.subheading')}
      </AppText>

      {submitted ? (
        <StatusScreen
          icon="checkmark-circle-outline"
          iconSize={40}
          title={t('auth.forgotPassword.successTitle')}
          body={t('auth.forgotPassword.successBody')}
          cta={{ label: t('auth.forgotPassword.backToSignIn'), onPress: () => router.back() }}
          containerStyle={styles.successBox}
        />
      ) : (
        <>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value }, fieldState: { error: fe } }) => (
              <FormField
                label={t('auth.forgotPassword.emailLabel')}
                placeholder={t('auth.forgotPassword.emailPlaceholder')}
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    heading: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subheading: {
      marginBottom: spacing.xl,
    },
    submitButton: { marginTop: spacing.xl },
    successBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      paddingTop: spacing.xl,
      backgroundColor: 'transparent',
    },
  });
