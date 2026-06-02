import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/useAuth';
import { AppText } from '@/components/AppText';
import { StatusScreen } from '@/components/StatusScreen';
import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

export default function AuthCallbackScreen() {
  const { t } = useTranslation();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { exchangeCodeForSession } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  // Derive the missing-code error at render time to avoid calling setState
  // synchronously inside an effect (react-hooks/set-state-in-effect).
  const displayError = !code ? t('auth.authCallback.errorBody') : error;

  useEffect(() => {
    if (!code) return;
    exchangeCodeForSession(code)
      .then(() => {
        // On success: onAuthStateChange in AuthProvider sets the session →
        // root layout guard navigates to /(tabs) automatically.
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : t('auth.authCallback.errorBody'));
      });
  }, [code, exchangeCodeForSession, t]);

  if (displayError) {
    return (
      <StatusScreen
        icon="alert-circle-outline"
        iconColor={theme.colors.errorInk}
        title={t('auth.authCallback.errorTitle')}
        body={displayError}
        cta={{
          label: t('auth.authCallback.backToSignIn'),
          onPress: () => router.replace('/(auth)/sign-in' as Href),
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primaryRest} />
      <AppText variant="body" muted style={styles.body}>
        {t('auth.authCallback.verifying')}
      </AppText>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
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
