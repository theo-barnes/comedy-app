import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';

import { darkTokens, spacing, radii, navigationTabs, createTypography } from '@/theme/tokens';
import { useAppFonts } from '@/theme/FontRegister';
import type { Theme } from '@/theme/types';

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: PropsWithChildren) {
  const fontsLoaded = useAppFonts();

  const theme = useMemo<Theme>(
    () => ({
      colors: darkTokens,
      spacing,
      radii,
      typography: createTypography(fontsLoaded),
      navigationTabs,
    }),
    [fontsLoaded],
  );

  const value = useMemo<ThemeContextValue>(() => ({ theme }), [theme]);

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
