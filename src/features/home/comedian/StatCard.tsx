import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  value: string;
  label: string;
  delta: string;
};

export function StatCard({ value, label, delta }: Props) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      gap: 4,
      paddingVertical: spacing.md,
    },
    value: {
      fontWeight: '700',
    },
    label: {
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    delta: {
      color: theme.colors.primaryRest,
    },
  });
