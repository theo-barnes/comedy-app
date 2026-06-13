// Mock native modules that are not available in the Jest environment.

jest.mock('@sentry/react-native', () => ({
  __esModule: true,
  init: jest.fn(),
  wrap: <T>(component: T) => component,
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));

// The app-level wrapper imports @/lib/env, which requires real env vars — stub it.
jest.mock('@/lib/sentry', () => ({
  __esModule: true,
  initSentry: jest.fn(),
  Sentry: {
    init: jest.fn(),
    wrap: <T>(component: T) => component,
    captureException: jest.fn(),
    captureMessage: jest.fn(),
  },
}));

jest.mock('expo-glass-effect', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return {
    __esModule: true,
    GlassView: View,
    GlassContainer: View,
    isLiquidGlassAvailable: jest.fn(() => false),
    isGlassEffectAPIAvailable: jest.fn(() => false),
  };
});

jest.mock('@expo/vector-icons', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text } = require('react-native');
  return new Proxy(
    {},
    {
      get: (_target, name) => {
        const MockIcon = ({ name: iconName }: { name: string }) =>
          React.createElement(Text, null, iconName);
        MockIcon.displayName = String(name);
        return MockIcon;
      },
    },
  );
});

jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View, Text, ScrollView } = require('react-native');

  return {
    __esModule: true,
    default: {
      View,
      Text,
      ScrollView,
      createAnimatedComponent: <T>(Component: T) => Component,
    },
    useSharedValue: <T>(initialValue: T) => ({ value: initialValue }),
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    withSpring: <T>(toValue: T) => toValue,
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  },
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: jest.fn(() => '/'),
  useSegments: jest.fn(() => []),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: { type: '3rdParty', init: jest.fn() },
}));

jest.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
  t: (key: string) => key,
}));

jest.mock('@expo-google-fonts/inter', () => ({
  Inter_400Regular: 'Inter_400Regular',
  Inter_500Medium: 'Inter_500Medium',
  Inter_600SemiBold: 'Inter_600SemiBold',
  Inter_700Bold: 'Inter_700Bold',
  Inter_800ExtraBold: 'Inter_800ExtraBold',
  useFonts: () => [true, null],
}));
