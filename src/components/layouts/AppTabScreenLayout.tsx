import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';

type InlineTab = {
  id: string;
  label: string;
  accessibilityLabel?: string;
};

export type AppTabScreenLayoutProps = PropsWithChildren<{
  city: string;
  onCityPress?: () => void;
  tabLabel: string;
  avatarUri?: string;
  inlineTabs?: readonly InlineTab[];
  activeInlineTabId?: string;
  onInlineTabPress?: (tabId: string) => void;
  onAvatarPress?: () => void;
  topControls?: ReactNode;
  hero?: ReactNode;
  controls?: ReactNode;
  bodyMode?: 'scroll' | 'static';
  overlayHeader?: boolean;
  backgroundStyle?: StyleProp<ViewStyle>;
  scrollContentContainerStyle?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
}>;

export function AppTabScreenLayout({
  city,
  onCityPress,
  tabLabel,
  avatarUri,
  inlineTabs,
  activeInlineTabId,
  onInlineTabPress,
  onAvatarPress,
  topControls,
  hero,
  controls,
  bodyMode = 'static',
  overlayHeader = false,
  backgroundStyle,
  scrollContentContainerStyle,
  bodyStyle,
  children,
}: AppTabScreenLayoutProps) {
  const header = (
    <ScreenHeader
      city={city}
      onCityPress={onCityPress}
      tabLabel={tabLabel}
      avatarUri={avatarUri}
      inlineTabs={inlineTabs}
      activeInlineTabId={activeInlineTabId}
      onInlineTabPress={onInlineTabPress}
      onAvatarPress={onAvatarPress}
    />
  );

  if (bodyMode === 'scroll') {
    return (
      <Screen>
        <View style={[styles.root, backgroundStyle]}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.scrollContent, scrollContentContainerStyle]}
            showsVerticalScrollIndicator={false}
          >
            {header}
            {topControls}
            {hero}
            {controls}
            {children}
          </ScrollView>
        </View>
      </Screen>
    );
  }

  if (overlayHeader) {
    return (
      <Screen>
        <View style={[styles.root, backgroundStyle]}>
          <View style={[styles.staticBody, bodyStyle]}>{children}</View>
          <View style={styles.overlayHeader} pointerEvents="box-none">
            {header}
            {topControls}
            {controls}
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={[styles.root, backgroundStyle]}>
        {header}
        {topControls}
        {hero}
        {controls}
        <View style={[styles.staticBody, bodyStyle]}>{children}</View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  staticBody: {
    flex: 1,
  },
  overlayHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
