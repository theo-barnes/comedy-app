import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/useAuth';
import { AppText } from '@/components/AppText';
import { StatusScreen } from '@/components/StatusScreen';
import { colors, spacing } from '@/theme';

export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { exchangeCodeForSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setError(t('auth.authCallback.errorBody'));
      return;
    }
    exchangeCodeForSession(code)
      .then(() => {
        // On success: onAuthStateChange in AuthProvider sets the session →
        // root layout guard navigates to /(tabs) automatically.
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t('auth.authCallback.errorBody'));
      });
  }, [code, exchangeCodeForSession, t]);

  if (error) {
    return (
      <StatusScreen
        icon="alert-circle-outline"
        iconColor={colors.error}
        title={t('auth.authCallback.errorTitle')}
        body={t('auth.authCallback.errorBody')}
        cta={{
          label: t('auth.authCallback.backToSignIn'),
          onPress: () => router.replace('/(auth)/sign-in' as Href),
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <AppText variant="body" muted style={styles.body}>
        {t('auth.authCallback.verifying')}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  body: {
    textAlign: 'center',
    lineHeight: 24,
  },
});
