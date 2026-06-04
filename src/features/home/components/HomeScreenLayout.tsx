import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { AppTabScreenLayout } from '@/components/layouts/AppTabScreenLayout';
import { HomeHeroHeader } from '@/components/HomeHeroHeader';

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
    <AppTabScreenLayout
      city={city}
      tabLabel="Home"
      avatarUri={avatarUri}
      hero={<HomeHeroHeader title={heroTitle} subtitle={heroSubtitle} />}
      bodyMode="scroll"
      scrollContentContainerStyle={contentContainerStyle}
    >
      {children}
    </AppTabScreenLayout>
  );
}
