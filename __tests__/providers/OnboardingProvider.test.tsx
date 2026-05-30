import { act, render, renderHook } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';

import { OnboardingContext, OnboardingProvider } from '@/providers/OnboardingProvider';
import { useOnboarding } from '@/hooks/useOnboarding';

const mockGet = SecureStore.getItemAsync as jest.Mock;
const mockSet = SecureStore.setItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// In tests __DEV__ is true, so FORCE_ONBOARDING is also true.
// Under FORCE_ONBOARDING the provider sets hasSeenOnboarding = false immediately
// and markOnboardingSeen skips SecureStore but still updates state.

describe('OnboardingProvider — FORCE_ONBOARDING mode (default in tests)', () => {
  it('provides hasSeenOnboarding as false immediately', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingProvider>{children}</OnboardingProvider>
    );

    const { result } = renderHook(() => useOnboarding(), { wrapper });

    // No async wait needed — FORCE_ONBOARDING sets state synchronously via useEffect.
    await act(async () => {});
    expect(result.current.hasSeenOnboarding).toBe(false);
  });

  it('does not call SecureStore.getItemAsync when FORCE_ONBOARDING is on', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingProvider>{children}</OnboardingProvider>
    );
    renderHook(() => useOnboarding(), { wrapper });
    await act(async () => {});
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('markOnboardingSeen sets hasSeenOnboarding to true', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingProvider>{children}</OnboardingProvider>
    );

    const { result } = renderHook(() => useOnboarding(), { wrapper });

    await act(async () => {
      await result.current.markOnboardingSeen();
    });

    expect(result.current.hasSeenOnboarding).toBe(true);
  });

  it('markOnboardingSeen does not call SecureStore.setItemAsync under FORCE_ONBOARDING', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <OnboardingProvider>{children}</OnboardingProvider>
    );

    const { result } = renderHook(() => useOnboarding(), { wrapper });

    await act(async () => {
      await result.current.markOnboardingSeen();
    });

    expect(mockSet).not.toHaveBeenCalled();
  });
});
