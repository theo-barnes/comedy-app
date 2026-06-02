import { StyleSheet, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { Theme } from '@/theme/types';

type Props = {
  /** Progress ratio from 0 to 1. */
  progress: number;
};

export function ProgressBar({ progress }: Props) {
  const styles = useThemedStyles(createStyles);
  const clampedProgress = Math.min(1, Math.max(0, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clampedProgress * 100}%` }]} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    track: {
      height: 3,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      backgroundColor: theme.colors.primaryRest,
      borderRadius: 2,
    },
  });
