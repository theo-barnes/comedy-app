import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { AvatarStack } from '@/features/home/components/AvatarStack';
import { Badge, type BadgeVariant } from '@/features/home/components/Badge';
import { homeCardTypography } from '@/features/home/cardTypography';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  daysUntil: number;
  hoursUntil: number;
  roleBadge: BadgeVariant;
  showTitle: string;
  venue: string;
  date: string;
  doorsTime: string;
  performerAvatars: Array<string | undefined>;
  onTheBillCount: number;
};

export function NextGigCard({
  daysUntil,
  hoursUntil,
  roleBadge,
  showTitle,
  venue,
  date,
  doorsTime,
  performerAvatars,
  onTheBillCount,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createCardStyles);
  return (
    <Card style={styles.card}>
      <View style={styles.countdown}>
        <CountdownUnit value={daysUntil} unit="days" />
        <CountdownUnit value={hoursUntil} unit="hrs" />
      </View>
      <View style={styles.badgeRow}>
        <Badge variant={roleBadge} />
      </View>
      <AppText
        variant={homeCardTypography.nextGigTitle.variant}
        style={homeCardTypography.nextGigTitle.style}
        numberOfLines={homeCardTypography.nextGigTitle.numberOfLines}
      >
        {showTitle}
      </AppText>
      <AppText
        variant={homeCardTypography.rowSubtitle.variant}
        muted
        numberOfLines={homeCardTypography.rowSubtitle.numberOfLines}
      >
        {`${venue} · ${date} · ${t('home.comedian.doors', { time: doorsTime })}`}
      </AppText>
      <View style={styles.footer}>
        <AvatarStack
          avatars={performerAvatars}
          label={t('home.comedian.onTheBill', { count: onTheBillCount })}
        />
        <Pressable onPress={() => {}}>
          <AppText variant="caption" style={styles.viewLink}>
            {t('home.comedian.viewGig')}
          </AppText>
        </Pressable>
      </View>
    </Card>
  );
}

function CountdownUnit({ value, unit }: { value: number; unit: string }) {
  const styles = useThemedStyles(createUnitStyles);
  return (
    <View style={styles.countdownUnit}>
      <AppText
        variant={homeCardTypography.nextGigCountdownValue.variant}
        style={[homeCardTypography.nextGigCountdownValue.style, styles.countdownValue]}
        numberOfLines={homeCardTypography.nextGigCountdownValue.numberOfLines}
      >
        {String(value)}
      </AppText>
      <AppText variant="caption" muted>
        {unit}
      </AppText>
    </View>
  );
}

const createCardStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      marginHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    countdown: {
      flexDirection: 'row',
      gap: spacing.xl,
    },
    badgeRow: {
      flexDirection: 'row',
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    viewLink: {
      color: theme.colors.primaryRest,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
  });

const createUnitStyles = (theme: Theme) =>
  StyleSheet.create({
    countdownUnit: {
      alignItems: 'center',
      gap: 2,
    },
    countdownValue: {
      color: theme.colors.primaryRest,
    },
  });
