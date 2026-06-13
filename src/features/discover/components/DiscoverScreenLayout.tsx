import type { PropsWithChildren } from 'react';

import { AppTabScreenLayout } from '@/components/layouts/AppTabScreenLayout';
import { useHeaderLocationLabel } from '@/features/location';
import { useTheme } from '@/providers/ThemeProvider';

import type { DiscoverConfig } from '../types';

type DiscoverScreenLayoutProps = PropsWithChildren<{
  config: DiscoverConfig;
  avatarUri?: string;
}>;

export function DiscoverScreenLayout({ avatarUri, children }: DiscoverScreenLayoutProps) {
  const { theme } = useTheme();
  const { cityLabel, onCityPress } = useHeaderLocationLabel();

  return (
    <AppTabScreenLayout
      city={cityLabel}
      onCityPress={onCityPress}
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
