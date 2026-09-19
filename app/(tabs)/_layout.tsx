import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';

import { isLiquidGlassCapable } from '@/components/GlassSurface';
import { useTheme } from '@/providers/ThemeProvider';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/useAuth';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size} color={color as string} />
  );
}

/**
 * Native tab bar (UITabBarController) for iOS 26+.
 *
 * The system owns the tab bar chrome, so Liquid Glass — the floating,
 * translucent, refractive material — comes for free and stays correct
 * across scroll edge effects, Reduce Transparency, and dark mode.
 * Styling is deliberately minimal: only the brand tint is applied.
 */
function NativeTabsLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const canCreate = profile?.role === 'comedian' || profile?.role === 'venue';
  return (
    <NativeTabs tintColor={theme.colors.primaryRest}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>{t('tabs.discover')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'play.circle', selected: 'play.circle.fill' }} />
      </NativeTabs.Trigger>
      {canCreate ? (
        <NativeTabs.Trigger name="create">
          <NativeTabs.Trigger.Label>Create</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="plus.circle.fill" />
        </NativeTabs.Trigger>
      ) : null}
      <NativeTabs.Trigger name="saved">
        <NativeTabs.Trigger.Label>{t('tabs.saved')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bookmark', selected: 'bookmark.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t('tabs.profile')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

/** JS tab bar fallback for Android, web, and iOS < 26. */
function JsTabsLayout() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const canCreate = profile?.role === 'comedian' || profile?.role === 'venue';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primaryRest,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: tabIcon('calendar', 'calendar-outline'),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: t('tabs.discover'),
          tabBarIcon: tabIcon('play-circle', 'play-circle-outline'),
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: 'rgba(14,14,16,0.88)',
            borderTopColor: 'rgba(255,255,255,0.12)',
          },
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          href: canCreate ? undefined : null,
          title: 'Create',
          tabBarIcon: tabIcon('add-circle', 'add-circle-outline'),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t('tabs.saved'),
          tabBarIcon: tabIcon('bookmark', 'bookmark-outline'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: tabIcon('person', 'person-outline'),
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  // Static capability check: the navigator choice must not change mid-session.
  return isLiquidGlassCapable ? <NativeTabsLayout /> : <JsTabsLayout />;
}
