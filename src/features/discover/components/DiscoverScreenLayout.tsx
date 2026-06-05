import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { PropsWithChildren, ReactNode } from 'react';

import { AppTabScreenLayout } from '@/components/layouts/AppTabScreenLayout';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing } from '@/theme';
import type { Theme } from '@/theme/types';

import type { DiscoverConfig, DiscoverView } from '../types';

type DiscoverScreenLayoutProps = PropsWithChildren<{
  config: DiscoverConfig;
  activeView: DiscoverView;
  avatarUri?: string;
  topControls?: ReactNode;
}>;

export function DiscoverScreenLayout({
  config,
  activeView,
  avatarUri,
  topControls,
  children,
}: DiscoverScreenLayoutProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, activeView), [theme, activeView]);

  return (
    <AppTabScreenLayout
      city={config.city}
      tabLabel="Discover"
      avatarUri={avatarUri}
      topControls={<View style={styles.topControlsWrap}>{topControls}</View>}
      backgroundStyle={styles.background}
      bodyMode="static"
      overlayHeader={activeView === 'clips'}
    >
      {children}
    </AppTabScreenLayout>
  );
}

const createStyles = (theme: Theme, view: DiscoverView) =>
  StyleSheet.create({
    background: {
      backgroundColor: view === 'clips' ? theme.colors.surface : '#F5F3EE',
    },
    topControlsWrap: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
  });
