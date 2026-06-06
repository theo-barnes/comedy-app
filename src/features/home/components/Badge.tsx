import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

export type BadgeVariant =
  | 'hotTicket'
  | 'lateNight'
  | 'soldOut'
  | 'headliner'
  | 'weekly'
  | 'onSale'
  | 'emerging'
  | 'curated'
  | 'premium'
  | 'support';

type BadgeStyle = { bg: string; text: string };

function getBadgeStyles(theme: Theme): Record<BadgeVariant, BadgeStyle> {
  const standard = { bg: theme.colors.badgeFill, text: theme.colors.badgeInk };
  return {
    hotTicket: standard,
    lateNight: standard,
    soldOut: { bg: theme.colors.errorFill, text: theme.colors.errorInk },
    headliner: { bg: theme.colors.primaryRest, text: theme.colors.onPrimary },
    weekly: standard,
    onSale: standard,
    emerging: standard,
    curated: standard,
    premium: standard,
    support: { bg: theme.colors.card, text: theme.colors.textMuted },
  };
}

const BADGE_LABELS: Record<BadgeVariant, string> = {
  hotTicket: 'HOT TICKET',
  lateNight: 'LATE NIGHT',
  soldOut: 'SOLD OUT',
  headliner: 'HEADLINER',
  weekly: 'WEEKLY',
  onSale: 'ON SALE',
  emerging: 'EMERGING',
  curated: 'CURATED',
  premium: 'PREMIUM',
  support: 'SUPPORT',
};

type Props = { variant: BadgeVariant };

export function Badge({ variant }: Props) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const badgeStyleMap = useMemo(() => getBadgeStyles(theme), [theme]);
  const { bg, text } = badgeStyleMap[variant];
  return (
    <View testID={`badge-pill-${variant}`} style={[styles.pill, { backgroundColor: bg }]}>
      <AppText
        testID={`badge-label-${variant}`}
        variant="caption"
        style={[styles.label, { color: text }]}
      >
        {BADGE_LABELS[variant]}
      </AppText>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    pill: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radii.sm,
      alignSelf: 'flex-start',
    },
    label: {
      fontWeight: '600',
      letterSpacing: 0.5,
    },
  });
