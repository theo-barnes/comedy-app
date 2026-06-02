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
  return {
    hotTicket: { bg: '#5C1A1A', text: theme.colors.textPrimary },
    lateNight: { bg: '#1A1A3D', text: theme.colors.textPrimary },
    soldOut: { bg: '#5C1A1A', text: theme.colors.textPrimary },
    headliner: { bg: theme.colors.primaryRest, text: '#FFFFFF' },
    weekly: { bg: '#2A3D1A', text: theme.colors.textPrimary },
    onSale: { bg: '#1A5C2A', text: theme.colors.textPrimary },
    emerging: { bg: '#1A4040', text: theme.colors.textPrimary },
    curated: { bg: '#3D3A1A', text: theme.colors.textPrimary },
    premium: { bg: '#2D1A5C', text: theme.colors.textPrimary },
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
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <AppText variant="caption" style={[styles.label, { color: text }]}>
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
