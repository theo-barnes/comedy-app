import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { HomeHeroHeader } from '@/components/HomeHeroHeader';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { spacing } from '@/theme';

export type HomeScreenLayoutProps = PropsWithChildren<{
  city: string;
  heroTitle: string;
  heroSubtitle: string;
  avatarUri?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function HomeScreenLayout({
  city,
  heroTitle,
  heroSubtitle,
  avatarUri,
  contentContainerStyle,
  children,
}: HomeScreenLayoutProps) {
  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <ScreenHeader city={city} tabLabel="Home" avatarUri={avatarUri} />
          <HomeHeroHeader title={heroTitle} subtitle={heroSubtitle} />
        </View>

        {children}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
});
