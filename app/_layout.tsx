import { useEffect } from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AppProviders } from '@/providers/AppProviders';
import { useTheme } from '@/providers/ThemeProvider';
import { useAuth } from '@/features/auth/useAuth';
import { useOnboarding } from '@/hooks/useOnboarding';

// Keep the splash screen visible until auth, onboarding, and theme state have resolved.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <RootNavigator />
    </AppProviders>
  );
}

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
