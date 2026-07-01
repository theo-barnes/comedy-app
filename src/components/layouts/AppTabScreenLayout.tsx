import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
/**
 * Type for the inline tabs that can be displayed in the header of the AppTabScreenLayout. Each tab has an id, label, and an optional accessibility label.
 * @param id - Unique identifier for the tab.
 * @param label - The text label displayed on the tab.
 * @param accessibilityLabel - Optional label for accessibility purposes.
 */
type InlineTab = {
  id: string;
  label: string;
  accessibilityLabel?: string;
};

/**
 * Properties for the AppTabScreenLayout component, which provides a layout for screens with a header, optional inline tabs, and a body that can be either scrollable or static.
 * @param city - The name of the city to display in the header.
 * @param onCityPress - Optional callback when the city is pressed.
 * @param tabLabel - The label for the main tab in the header.
 * @param avatarUri - Optional URI for the user's avatar to display in the header.
 * @param inlineTabs - Optional array of inline tabs to display below the main tab.
 * @param activeInlineTabId - Optional id of the currently active inline tab.
 * @param onInlineTabPress - Optional callback when an inline tab is pressed, receiving the tab's id.
 * @param onAvatarPress - Optional callback when the avatar is pressed.
 * @param topControls - Optional ReactNode to render above the body content.
 * @param hero - Optional ReactNode to render as a hero section below the header and top controls.
 * @param controls - Optional ReactNode to render below the hero section and above the body content.
 * @param bodyMode - Determines if the body content is scrollable ('scroll') or static ('static'). Defaults to 'static'.
 * @param overlayHeader - If true, the header and controls will overlay the body content. Defaults to false.
 * @param backgroundStyle - Optional style for the background of the layout.
 * @param scrollContentContainerStyle - Optional style for the content container of the ScrollView when bodyMode is 'scroll'.
 * @param bodyStyle - Optional style for the body content container.
 */
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

/**
 * Functional component that provides a layout for screens with a header, optional inline tabs, and a body that can be either scrollable or static.
 * It also supports overlaying the header and controls over the body content.
 * @param param0 - The properties for the AppTabScreenLayout component.
 * @returns A React element representing the layout.
 */
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

  /*
   * If the bodyMode is set to 'scroll', we render a ScrollView that contains the header, top controls, hero section, controls, and children.
   * This allows the entire content to be scrollable.
   */
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

  /*
   * If the overlayHeader prop is true, we render the header and controls in an absolutely positioned View that overlays the body content.
   * This allows for a layout where the header and controls are always visible on top of the body content.
   */
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

  /*
   * If neither bodyMode is 'scroll' nor overlayHeader is true, we render a static layout with the header, top controls, hero section, controls, and body content.
   */
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

/*
 * Styles for the AppTabScreenLayout component, defining the layout and positioning of the root container, scrollable content, static body, and overlay header.
 */
const styles = StyleSheet.create({
  root: {
    // Fill the entire screen
    flex: 1,
  },
  flex: {
    // Fill the available space in the parent container
    flex: 1,
  },
  scrollContent: {
    // Ensure the scrollable content fills the available space and allows for scrolling
    flexGrow: 1,
  },
  staticBody: {
    // Fill the available space in the parent container for static body content
    flex: 1,
  },
  overlayHeader: {
    // Absolutely position the header and controls to overlay the body content
    position: 'absolute',
    // Position at the top of the screen
    top: 0,
    left: 0,
    right: 0,
    // Ensure the overlay is above other content
    zIndex: 10,
  },
});
