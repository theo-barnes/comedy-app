import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';

const SAFE_AREA_EDGES: Edge[] = ['top', 'left', 'right'];

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { Theme } from '@/theme/types';

export function Screen({ children }: PropsWithChildren) {
  const styles = useThemedStyles(createStyles);
  return (
    <SafeAreaView edges={SAFE_AREA_EDGES} style={styles.safeArea}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    content: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
  });
