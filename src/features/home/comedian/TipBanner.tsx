import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { homeCardTypography } from '@/features/home/cardTypography';
import { ProgressBar } from '@/features/home/components/ProgressBar';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

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
  const styles = useThemedStyles(createStyles);

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
        <AppText
          variant={homeCardTypography.bannerTitle.variant}
          style={homeCardTypography.bannerTitle.style}
          numberOfLines={homeCardTypography.bannerTitle.numberOfLines}
        >
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      color: theme.colors.textMuted,
      lineHeight: 20,
    },
    content: {
      gap: spacing.sm,
      paddingRight: spacing.xl,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  });
