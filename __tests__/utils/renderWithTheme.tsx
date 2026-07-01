import { render, type RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ThemeProvider } from '@/providers/ThemeProvider';
import type { ThemeMode } from '@/theme/types';

type RenderWithThemeOptions = RenderOptions & {
  /** Render in a specific theme mode. Defaults to 'system' (inherits OS scheme). */
  themeMode?: ThemeMode;
};

function AllProviders({
  children,
  themeMode,
  queryClient,
}: {
  children: React.ReactNode;
  themeMode?: ThemeMode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialMode={themeMode}>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}

export function renderWithTheme(
  ui: React.ReactElement,
  { themeMode, ...options }: RenderWithThemeOptions = {},
) {
  const resolvedThemeMode: ThemeMode = themeMode ?? 'system';
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllProviders themeMode={resolvedThemeMode} queryClient={queryClient}>
      {children}
    </AllProviders>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}
