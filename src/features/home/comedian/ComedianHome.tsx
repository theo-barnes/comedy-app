import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { EventCard } from '@/features/home/components/EventCard';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { PerformerCard } from '@/features/home/components/PerformerCard';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { spacing } from '@/theme';
import type { BadgeVariant } from '@/features/home/components/Badge';

import { GigListItem } from './GigListItem';
import { NextGigCard } from './NextGigCard';
import { StatCard } from './StatCard';
import { TipBanner } from './TipBanner';

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

const MOCK_COMEDIAN_DATA = {
  city: 'London',
  notificationCount: 3,
  comedianName: 'Asha',
  nextGig: {
    daysUntil: 4,
    hoursUntil: 6,
    roleBadge: 'headliner' as BadgeVariant,
    showTitle: 'Store Nights: Friday Late',
    venue: 'The Comedy Store',
    date: 'Fri, 6 Jun',
    doorsTime: '8:30 PM',
    performerAvatars: [undefined, undefined, undefined] as Array<string | undefined>,
    onTheBillCount: 3,
  },
  stats: [
    { id: '1', value: '1.4K', label: 'PROFILE VIEWS', delta: '+18% this week' },
    { id: '2', value: '3.2K', label: 'CLIP PLAYS', delta: '+31% this week' },
    { id: '3', value: '84', label: 'NEW FOLLOWERS', delta: '+12% this week' },
  ],
  tip: {
    title: 'Add more clips.',
    body: 'Profiles with 3+ clips get 4× more enquiries from promoters. You have 1.',
    progress: 1 / 3,
    step: 1,
    totalSteps: 3,
    ctaLabel: 'Upload',
  },
  gigs: [
    {
      id: '1',
      venue: 'The Comedy Store',
      date: 'Fri, 6 Jun · 9 PM',
      roleBadge: 'headliner' as BadgeVariant,
    },
    {
      id: '2',
      venue: 'Soho Theatre',
      date: 'Sat, 14 Jun · 8 PM',
      roleBadge: 'support' as BadgeVariant,
    },
  ],
  sameNightDate: 'FRI 6 JUN',
  sameNightEvents: [
    { id: '1', title: 'New Acts Night', subtitle: 'Angel Comedy Club' },
    { id: '2', title: 'Thursday Late at the Creek', subtitle: 'Up The Creek' },
  ],
  othersOnCircuit: [
    { id: '1', name: 'Marcus Cole', subtitle: '29.1K' },
    { id: '2', name: 'Siobhan Gallagher', subtitle: '18.4K' },
    { id: '3', name: 'Tariq Hassan', subtitle: '11.2K' },
  ],
};

export function ComedianHome() {
  const { t } = useTranslation();
  const { nextGig, stats, tip, gigs, sameNightEvents, othersOnCircuit } = MOCK_COMEDIAN_DATA;
  const timeOfDay = getTimeOfDay();

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader
          city={MOCK_COMEDIAN_DATA.city}
          role="comedian"
          notificationCount={MOCK_COMEDIAN_DATA.notificationCount}
        />

        <View style={styles.titleBlock}>
          <AppText variant="title">
            {t('home.comedian.greeting', {
              timeOfDay,
              name: MOCK_COMEDIAN_DATA.comedianName,
            })}
          </AppText>
          <AppText muted>{t('home.comedian.nextGigIn', { count: nextGig.daysUntil })}</AppText>
        </View>

        <NextGigCard
          daysUntil={nextGig.daysUntil}
          hoursUntil={nextGig.hoursUntil}
          roleBadge={nextGig.roleBadge}
          showTitle={nextGig.showTitle}
          venue={nextGig.venue}
          date={nextGig.date}
          doorsTime={nextGig.doorsTime}
          performerAvatars={nextGig.performerAvatars}
          onTheBillCount={nextGig.onTheBillCount}
        />

        {/* Stats */}
        <View style={styles.statsRow}>
          {stats.map((s) => (
            <StatCard key={s.id} value={s.value} label={s.label} delta={s.delta} />
          ))}
        </View>

        <TipBanner
          title={tip.title}
          body={tip.body}
          progress={tip.progress}
          step={tip.step}
          totalSteps={tip.totalSteps}
          ctaLabel={tip.ctaLabel}
        />

        {/* YOUR GIGS */}
        <SectionHeader
          label={t('home.comedian.yourGigs')}
          actionLabel={t('home.comedian.manage')}
          onAction={() => {}}
        />
        <View style={styles.gigList}>
          {gigs.map((g) => (
            <GigListItem key={g.id} venue={g.venue} date={g.date} roleBadge={g.roleBadge} />
          ))}
        </View>

        {/* ON THE SAME NIGHT AS YOU */}
        <SectionHeader
          label={t('home.comedian.sameNight', { date: MOCK_COMEDIAN_DATA.sameNightDate })}
        />
        <View style={styles.twoColGrid}>
          {sameNightEvents.map((e) => (
            <EventCard key={e.id} title={e.title} subtitle={e.subtitle} />
          ))}
        </View>

        {/* OTHERS ON THE CIRCUIT */}
        <SectionHeader
          label={t('home.comedian.othersOnCircuit')}
          actionLabel={t('common.seeAll')}
          onAction={() => {}}
        />
        <View style={styles.threeColGrid}>
          {othersOnCircuit.map((p) => (
            <PerformerCard key={p.id} name={p.name} subtitle={p.subtitle} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  titleBlock: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  gigList: {
    gap: spacing.sm,
  },
  twoColGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  threeColGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
});
