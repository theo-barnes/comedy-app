import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { colors, spacing } from '@/theme';

type Props = {
  value: string;
  label: string;
  delta: string;
};

export function StatCard({ value, label, delta }: Props) {
  return (
    <Card style={styles.card}>
      <AppText variant="title" style={styles.value}>
        {value}
      </AppText>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="caption" style={styles.delta}>
        {delta}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 4,
    paddingVertical: spacing.md,
  },
  value: {
    fontWeight: '700',
  },
  label: {
    color: colors.foregroundMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  delta: {
    color: colors.primary,
  },
});
