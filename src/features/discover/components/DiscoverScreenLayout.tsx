import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { PropsWithChildren } from 'react';

import { AppText } from '@/components/AppText';
import { AppTabScreenLayout } from '@/components/layouts/AppTabScreenLayout';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing } from '@/theme';
import type { Theme } from '@/theme/types';

import type { DiscoverConfig, DiscoverView } from '../types';

type DiscoverScreenLayoutProps = PropsWithChildren<{
  config: DiscoverConfig;
  activeView: DiscoverView;
  onViewChange: (view: DiscoverView) => void;
  activeClipCategory: string;
  onClipCategoryChange: (category: string) => void;
  avatarUri?: string;
}>;

export function DiscoverScreenLayout({
  config,
  activeView,
  onViewChange,
  activeClipCategory,
  onClipCategoryChange,
  avatarUri,
  children,
}: DiscoverScreenLayoutProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme, activeView), [theme, activeView]);

  return (
    <AppTabScreenLayout
      city={config.city}
      tabLabel="Discover"
      avatarUri={avatarUri}
      inlineTabs={config.modes.map((mode) => ({ id: mode.id, label: mode.label }))}
      activeInlineTabId={activeView}
      onInlineTabPress={(tabId) => onViewChange(tabId as DiscoverView)}
      controls={
        activeView === 'clips' ? (
          <View style={styles.clipsTabs}>
            {config.clips.categories.map((category) => {
              const selected = activeClipCategory === category;
              return (
                <Pressable
                  key={category}
                  style={styles.clipTabButton}
                  onPress={() => onClipCategoryChange(category)}
                >
                  <AppText style={[styles.clipTabLabel, selected && styles.clipTabLabelActive]}>
                    {category}
                  </AppText>
                  <View
                    style={[styles.clipTabUnderline, selected && styles.clipTabUnderlineActive]}
                  />
                </Pressable>
              );
            })}
          </View>
        ) : null
      }
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
    clipsTabs: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: view === 'clips' ? theme.colors.border : 'rgba(255,255,255,0.08)',
    },
    clipTabButton: {
      alignItems: 'center',
      minWidth: 90,
    },
    clipTabLabel: {
      color: theme.colors.textMuted,
      fontSize: 30 / 2,
      fontWeight: '600',
      marginBottom: 10,
    },
    clipTabLabelActive: {
      color: theme.colors.textPrimary,
    },
    clipTabUnderline: {
      height: 2,
      width: '100%',
      backgroundColor: 'transparent',
    },
    clipTabUnderlineActive: {
      backgroundColor: theme.colors.primaryRest,
    },
  });
