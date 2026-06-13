import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { EventCard } from '@/features/home/components/EventCard';
import { FilterChips } from '@/features/home/components/FilterChips';
import { HomeScreenLayout } from '@/features/home/components/HomeScreenLayout';
import { PerformerCard } from '@/features/home/components/PerformerCard';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { HOME_SPACING } from '@/features/home/home-spacing';
import type { BadgeVariant } from '@/features/home/components/Badge';
import {
  CuratorSection,
  FullBillSection,
  LiveNowSection,
  TrendingSection,
  getBrowseConfig,
} from '@/features/browse';

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
  comedianName: 'Jane',
  nextGig: {
    daysUntil: 4,
    hoursUntil: 6,
    roleBadge: 'headliner' as BadgeVariant,
    showTitle: 'Store Nights: Friday Late',
    venue: 'The Comedy Store',
    date: 'Fri, 6 Jun',
    doorsTime: '8:30 PM',
    performerAvatars: [undefined, undefined, undefined] as (string | undefined)[],
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
    { id: '1', name: 'John Doe', subtitle: '29.1K' },
    { id: '2', name: 'Sarah Brown', subtitle: '18.4K' },
    { id: '3', name: 'Tom Jones', subtitle: '11.2K' },
  ],
};

export function ComedianHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const { nextGig, stats, tip, gigs, sameNightEvents, othersOnCircuit } = MOCK_COMEDIAN_DATA;
  const timeOfDay = getTimeOfDay();
  const browse = getBrowseConfig('comedian');
  const dayLabels = browse.days.map((d) => `${d.day} ${d.date}`);
  const [selectedDay, setSelectedDay] = useState(dayLabels[0] ?? '');

  return (
    <HomeScreenLayout
      heroTitle={t('home.comedian.greeting', {
        timeOfDay,
        name: MOCK_COMEDIAN_DATA.comedianName,
      })}
    >
      <View style={styles.featuredSection} testID="comedian-home-featured-section">
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
      </View>

      {/* Stats */}
      <View style={styles.statsRow} testID="comedian-home-stats-section">
        {stats.map((s) => (
          <StatCard key={s.id} value={s.value} label={s.label} delta={s.delta} />
        ))}
      </View>

      <View style={styles.tipSection} testID="comedian-home-tip-section">
        <TipBanner
          title={tip.title}
          body={tip.body}
          progress={tip.progress}
          step={tip.step}
          totalSteps={tip.totalSteps}
          ctaLabel={tip.ctaLabel}
        />
      </View>

      {/* YOUR GIGS */}
      <SectionHeader
        label={t('home.comedian.yourGigs')}
        actionLabel={t('home.comedian.manage')}
        onAction={() => {}}
      />
      <View style={styles.gigList} testID="comedian-home-gigs-section">
        {gigs.map((g) => (
          <GigListItem key={g.id} venue={g.venue} date={g.date} roleBadge={g.roleBadge} />
        ))}
      </View>

      {/* ON THE SAME NIGHT AS YOU */}
      <SectionHeader
        label={t('home.comedian.sameNight', { date: MOCK_COMEDIAN_DATA.sameNightDate })}
      />
      <View style={styles.twoColGrid} testID="comedian-home-same-night-section">
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

      {/* BROWSE — day filter + trending + curator + full bill + live now */}
      <FilterChips options={dayLabels} selected={selectedDay} onSelect={setSelectedDay} />
      <View style={styles.browseSection}>
        <TrendingSection sectionTitle="Trending Tonight" shows={browse.trendingShows} />
      </View>
      <View style={styles.browseSection}>
        <CuratorSection curator={browse.curator} />
      </View>
      <View style={styles.browseSection}>
        <FullBillSection
          sectionTitle={browse.fullBillKicker}
          shows={browse.fullBillShows}
          onMapPress={() => router.push('/map')}
        />
      </View>
      <View style={styles.browseSection}>
        <LiveNowSection panel={browse.liveNow} />
      </View>
    </HomeScreenLayout>
  );
}

const styles = StyleSheet.create({
  featuredSection: {
    marginTop: HOME_SPACING.featuredTop,
    marginBottom: HOME_SPACING.featuredBottom,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: HOME_SPACING.sectionHorizontalPadding,
    gap: HOME_SPACING.sectionGap,
    marginBottom: HOME_SPACING.sectionBottom,
  },
  tipSection: {
    marginBottom: HOME_SPACING.featuredBottom,
  },
  gigList: {
    gap: HOME_SPACING.sectionGap,
    marginBottom: HOME_SPACING.sectionBottom,
  },
  twoColGrid: {
    flexDirection: 'row',
    paddingHorizontal: HOME_SPACING.sectionHorizontalPadding,
    gap: HOME_SPACING.sectionGap,
    marginBottom: HOME_SPACING.sectionBottom,
  },
  threeColGrid: {
    flexDirection: 'row',
    paddingHorizontal: HOME_SPACING.sectionHorizontalPadding,
    gap: HOME_SPACING.sectionGap,
    marginBottom: HOME_SPACING.sectionBottom,
  },
  browseSection: {
    marginBottom: HOME_SPACING.sectionBottom,
  },
});
