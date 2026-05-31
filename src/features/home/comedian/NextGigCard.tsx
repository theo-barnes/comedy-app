import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { AvatarStack } from '@/features/home/components/AvatarStack';
import { Badge, type BadgeVariant } from '@/features/home/components/Badge';
import { colors, spacing } from '@/theme';

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
  return (
    <Card style={styles.card}>
      <View style={styles.countdown}>
        <CountdownUnit value={daysUntil} unit="days" />
        <CountdownUnit value={hoursUntil} unit="hrs" />
      </View>
      <View style={styles.badgeRow}>
        <Badge variant={roleBadge} />
      </View>
      <AppText variant="heading" style={styles.title}>
        {showTitle}
      </AppText>
      <AppText variant="caption" muted>
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
  return (
    <View style={styles.countdownUnit}>
      <AppText variant="title" style={styles.countdownValue}>
        {String(value)}
      </AppText>
      <AppText variant="caption" muted>
        {unit}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  countdown: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  countdownUnit: {
    alignItems: 'center',
    gap: 2,
  },
  countdownValue: {
    color: colors.primary,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
  },
  title: {
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  viewLink: {
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
