import { useEffect } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { initSentry, Sentry } from '@/lib/sentry';
import { AppProviders } from '@/providers/AppProviders';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/features/auth/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';

// Crash reporting first — so errors during startup are captured.
initSentry();

// Keep the splash screen visible until auth, onboarding, and theme state have resolved.
SplashScreen.preventAutoHideAsync();

function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <RootNavigator />
    </AppProviders>
  );
}

export default Sentry.wrap(RootLayout);

function RootNavigator() {
  const { isLoading, session, isGuest, profile } = useAuth();
  const { hasSeenOnboarding } = useOnboarding();
  const { isHydrated: isThemeHydrated } = useTheme();

  const isReady = !isLoading && hasSeenOnboarding !== null && isThemeHydrated;

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync();
  }, [isReady]);

  const needsRoleSelection = !!session && !isGuest && !profile?.role;
  const showApp = (!!session || isGuest) && !needsRoleSelection;
  const showOnboarding = hasSeenOnboarding === false;
  const showAuth = !showOnboarding && !showApp;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={showOnboarding}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>

      <Stack.Protected guard={showAuth}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={showApp}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="discover-search" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}
