import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

type Props = {
  /** Progress ratio from 0 to 1. */
  progress: number;
};

export function ProgressBar({ progress }: Props) {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${clampedProgress * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
