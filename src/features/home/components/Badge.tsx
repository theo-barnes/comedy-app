import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/theme';

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

const BADGE_STYLES: Record<BadgeVariant, BadgeStyle> = {
  hotTicket: { bg: '#5C1A1A', text: colors.foreground },
  lateNight: { bg: '#1A1A3D', text: colors.foreground },
  soldOut: { bg: '#5C1A1A', text: colors.foreground },
  headliner: { bg: colors.primary, text: colors.background },
  weekly: { bg: '#2A3D1A', text: colors.foreground },
  onSale: { bg: '#1A5C2A', text: colors.foreground },
  emerging: { bg: '#1A4040', text: colors.foreground },
  curated: { bg: '#3D3A1A', text: colors.foreground },
  premium: { bg: '#2D1A5C', text: colors.foreground },
  support: { bg: colors.backgroundElevated, text: colors.foregroundMuted },
};

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
  const { bg, text } = BADGE_STYLES[variant];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <AppText variant="caption" style={[styles.label, { color: text }]}>
        {BADGE_LABELS[variant]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
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
