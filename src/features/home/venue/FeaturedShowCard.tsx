import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Badge, type BadgeVariant } from '@/features/home/components/Badge';
import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';
import { ProgressBar } from '@/features/home/components/ProgressBar';
import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type ActionItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
};

type Props = {
  title: string;
  venue: string;
  date: string;
  statusBadge: BadgeVariant;
  ticketsSold: number;
  totalTickets: number;
  revenue: string;
  remaining: number;
  onWaitlist: number;
  progress: number;
  imageUri?: string;
};

export function FeaturedShowCard({
  title,
  venue,
  date,
  statusBadge,
  ticketsSold,
  totalTickets,
  revenue,
  remaining,
  onWaitlist,
  progress,
  imageUri,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  const actions: ActionItem[] = [
    { icon: 'add-outline', label: t('home.venue.addAct'), onPress: () => {} },
    { icon: 'share-outline', label: t('home.venue.share'), onPress: () => {} },
    { icon: 'camera-outline', label: t('home.venue.promote'), onPress: () => {} },
    { icon: 'options-outline', label: t('home.venue.edit'), onPress: () => {} },
  ];

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <AppText variant="caption" style={styles.nextEventLabel}>
          {t('home.venue.yourNextEvent')}
        </AppText>
        <Badge variant={statusBadge} />
      </View>

      <PlaceholderImage uri={imageUri} style={styles.image} />

      <View style={styles.info}>
        <AppText variant="heading" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="caption" muted>{`${venue} · ${date}`}</AppText>
      </View>

      <View style={styles.ticketRow}>
        <AppText variant="caption" muted>
          {t('home.venue.ticketsSold', { sold: ticketsSold, total: totalTickets })}
        </AppText>
        <AppText variant="body" style={styles.revenue}>
          {revenue}
        </AppText>
      </View>
      <ProgressBar progress={progress} />
      <View style={styles.ticketMeta}>
        <AppText variant="caption" muted>
          {`${Math.round(progress * 100)}%  ·  ${t('home.venue.remaining', { count: remaining })}`}
        </AppText>
        <AppText variant="caption" muted>
          {t('home.venue.onWaitlist', { count: onWaitlist })}
        </AppText>
      </View>

      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable key={action.label} style={styles.actionButton} onPress={action.onPress}>
            <Ionicons name={action.icon} size={20} color={theme.colors.textPrimary} />
            <AppText variant="caption" style={styles.actionLabel}>
              {action.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: spacing.lg,
      gap: spacing.sm,
      padding: spacing.md,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    nextEventLabel: {
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    image: {
      width: '100%',
      height: 160,
      borderRadius: radii.sm,
    },
    info: {
      gap: 4,
    },
    title: {
      fontWeight: '700',
    },
    ticketRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    revenue: {
      color: theme.colors.primaryRest,
      fontWeight: '700',
    },
    ticketMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    actionButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: radii.md,
      gap: spacing.xs,
      marginHorizontal: 2,
    },
    actionLabel: {
      fontWeight: '600',
      letterSpacing: 0.3,
      fontSize: 10,
    },
  });
