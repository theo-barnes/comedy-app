import { renderHook } from '@testing-library/react-native';

import { useOnboarding } from '@/hooks/useOnboarding';

describe('useOnboarding', () => {
  it('throws when used outside <OnboardingProvider>', () => {
    // Suppress the React error boundary console output during this test.
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useOnboarding())).toThrow(
      'useOnboarding must be used within <OnboardingProvider>',
    );
    consoleError.mockRestore();
  });
});
