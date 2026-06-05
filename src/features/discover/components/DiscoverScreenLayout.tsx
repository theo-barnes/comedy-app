import type { PropsWithChildren } from 'react';

import { AppTabScreenLayout } from '@/components/layouts/AppTabScreenLayout';
import { useTheme } from '@/providers/ThemeProvider';

import type { DiscoverConfig } from '../types';

type DiscoverScreenLayoutProps = PropsWithChildren<{
  config: DiscoverConfig;
  avatarUri?: string;
}>;

export function DiscoverScreenLayout({ config, avatarUri, children }: DiscoverScreenLayoutProps) {
  const { theme } = useTheme();

  return (
    <AppTabScreenLayout
      city={config.city}
      tabLabel="Discover"
      avatarUri={avatarUri}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      bodyMode="static"
      overlayHeader
    >
      {children}
    </AppTabScreenLayout>
  );
}
