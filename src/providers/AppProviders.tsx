import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Side-effect import — initialises i18next before first render
import '@/i18n';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { OnboardingProvider } from '@/providers/OnboardingProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <OnboardingProvider>
              <AuthProvider>{children}</AuthProvider>
            </OnboardingProvider>
          </ErrorBoundary>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
