import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/features/home/components/ProgressBar';
import { colors, spacing } from '@/theme';

type Props = {
  title: string;
  body: string;
  /** Progress ratio from 0 to 1. */
  progress: number;
  step: number;
  totalSteps: number;
  ctaLabel: string;
};

export function TipBanner({ title, body, progress, step, totalSteps, ctaLabel }: Props) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <Card style={styles.card}>
      <Pressable
        style={styles.dismissButton}
        onPress={() => setVisible(false)}
        accessibilityLabel="Dismiss tip"
      >
        <AppText style={styles.dismissText}>{'×'}</AppText>
      </Pressable>
      <View style={styles.content}>
        <AppText variant="body" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="caption" muted>
          {body}
        </AppText>
        <ProgressBar progress={progress} />
        <View style={styles.footer}>
          <AppText variant="caption" muted>{`${step} / ${totalSteps}`}</AppText>
          <Button variant="primary" size="sm" onPress={() => {}}>
            {ctaLabel}
          </Button>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  dismissButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    zIndex: 1,
    padding: spacing.xs,
  },
  dismissText: {
    fontSize: 18,
    color: colors.foregroundMuted,
    lineHeight: 20,
  },
  content: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  title: {
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
