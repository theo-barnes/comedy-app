import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import {
  darkTokens,
  lightTokens,
  spacing,
  radii,
  navigationTabs,
  createTypography,
} from '@/theme/tokens';
import { useAppFonts } from '@/theme/FontRegister';
import type { Theme, ThemeMode } from '@/theme/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORE_KEY = 'theme-mode';

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: Theme;
  /** The resolved colour scheme for the current theme */
  colorScheme: 'light' | 'dark';
  /** The user-selected mode (may be 'system') */
  themeMode: ThemeMode;
  /** True once stored preference has been loaded from SecureStore. */
  isHydrated: boolean;
  /** Persist a new mode preference; 'system' removes the stored override */
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

type ThemeProviderProps = PropsWithChildren<{
  /**
   * Seed the initial mode without waiting for SecureStore rehydration.
   * Useful in tests: `<ThemeProvider initialMode="dark">`. Ignored after mount.
   */
  initialMode?: ThemeMode;
}>;

export function ThemeProvider({ children, initialMode }: ThemeProviderProps) {
  const rawScheme = useColorScheme();
  const systemScheme: 'light' | 'dark' = rawScheme === 'light' ? 'light' : 'dark';
  const fontsLoaded = useAppFonts();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialMode ?? 'system');
  const [isHydrated, setIsHydrated] = useState(initialMode != null);

  // Rehydrate persisted preference on mount.
  // The `cancelled` flag prevents a stale async callback from calling setState
  // after the component has unmounted (e.g. during fast refresh or test teardown).
  useEffect(() => {
    let cancelled = false;
    SecureStore.getItemAsync(STORE_KEY)
      .then((stored) => {
        if (!cancelled && (stored === 'light' || stored === 'dark' || stored === 'system')) {
          setThemeModeState(stored);
        }
      })
      .catch((err) => {
        if (__DEV__) console.warn('[ThemeProvider] SecureStore unavailable:', err);
      })
      .finally(() => {
        if (!cancelled) setIsHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    setThemeModeState(mode);
    if (mode === 'system') {
      await SecureStore.deleteItemAsync(STORE_KEY);
    } else {
      await SecureStore.setItemAsync(STORE_KEY, mode);
    }
  }, []);

  const colorScheme: 'light' | 'dark' = themeMode === 'system' ? systemScheme : themeMode;

  const theme = useMemo<Theme>(
    () => ({
      colors: colorScheme === 'dark' ? darkTokens : lightTokens,
      spacing,
      radii,
      typography: createTypography(fontsLoaded),
      navigationTabs,
      colorScheme,
    }),
    [colorScheme, fontsLoaded],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, colorScheme, themeMode, isHydrated, setThemeMode }),
    [theme, colorScheme, themeMode, isHydrated, setThemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access the current resolved theme and mode controls.
 * Must be used inside <ThemeProvider>.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
