import type { PropsWithChildren } from 'react';

import { View, StyleSheet } from 'react-native';

type DiscoverScreenLayoutProps = PropsWithChildren<{
  avatarUri?: string;
}>;

export function DiscoverScreenLayout({
  avatarUri: _avatarUri,
  children,
}: DiscoverScreenLayoutProps) {
  return <View style={styles.container}>{children}</View>;
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#000000' } });
