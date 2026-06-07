import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { AppTabScreenLayout } from '@/components/layouts/AppTabScreenLayout';
import { HomeHeroHeader } from '@/components/HomeHeroHeader';
import { useHeaderLocationLabel } from '@/features/location';

export type HomeScreenLayoutProps = PropsWithChildren<{
  heroTitle: string;
  avatarUri?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function HomeScreenLayout({
  heroTitle,
  avatarUri,
  contentContainerStyle,
  children,
}: HomeScreenLayoutProps) {
  const { cityLabel, onCityPress } = useHeaderLocationLabel();

  return (
    <AppTabScreenLayout
      city={cityLabel}
      onCityPress={onCityPress}
      tabLabel="Home"
      avatarUri={avatarUri}
      hero={<HomeHeroHeader title={heroTitle} />}
      bodyMode="scroll"
      scrollContentContainerStyle={contentContainerStyle}
    >
      {children}
    </AppTabScreenLayout>
  );
}
