import { createContext, useCallback, useEffect, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'has_seen_onboarding';

// Set to true during development to always show the onboarding carousel on launch.
// Flip to false (or remove) before shipping to production.
const FORCE_ONBOARDING = __DEV__;

type OnboardingContextValue = {
  hasSeenOnboarding: boolean | null;
  markOnboardingSeen: () => Promise<void>;
};

export const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  // Initialise state directly from FORCE_ONBOARDING so we never call setState
  // synchronously inside an effect (react-hooks/set-state-in-effect).
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(
    FORCE_ONBOARDING ? false : null,
  );

  useEffect(() => {
    if (FORCE_ONBOARDING) return;
    SecureStore.getItemAsync(ONBOARDING_KEY).then((value) => {
      setHasSeenOnboarding(value === 'true');
    });
  }, []);

  const markOnboardingSeen = useCallback(async () => {
    if (!FORCE_ONBOARDING) {
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    }
    setHasSeenOnboarding(true);
  }, []);

  return (
    <OnboardingContext.Provider value={{ hasSeenOnboarding, markOnboardingSeen }}>
      {children}
    </OnboardingContext.Provider>
  );
}
