import { render, type RenderOptions } from '@testing-library/react-native';

import { ThemeProvider } from '@/providers/ThemeProvider';
import type { ThemeMode } from '@/theme/types';

type RenderWithThemeOptions = RenderOptions & {
  /** Render in a specific theme mode. Defaults to 'system' (inherits OS scheme). */
  themeMode?: ThemeMode;
};

function AllProviders({
  children,
  themeMode,
}: {
  children: React.ReactNode;
  themeMode?: ThemeMode;
}) {
  return <ThemeProvider initialMode={themeMode}>{children}</ThemeProvider>;
}

export function renderWithTheme(
  ui: React.ReactElement,
  { themeMode, ...options }: RenderWithThemeOptions = {},
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders themeMode={themeMode}>{children}</AllProviders>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}
