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
import {
  CuratorSection,
  FullBillSection,
  LiveNowSection,
  TrendingSection,
  getBrowseConfig,
} from '@/features/browse';

import { COMEDIAN_HOME_FIXTURE } from './comedian-home-fixture';
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

export function ComedianHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const { nextGig, stats, tip, gigs, sameNightEvents, othersOnCircuit } = COMEDIAN_HOME_FIXTURE;
  const timeOfDay = getTimeOfDay();
  const browse = getBrowseConfig('comedian');
  const dayLabels = browse.days.map((d) => `${d.day} ${d.date}`);
  const [selectedDay, setSelectedDay] = useState(dayLabels[0] ?? '');

  return (
    <HomeScreenLayout
      heroTitle={t('home.comedian.greeting', {
        timeOfDay,
        name: COMEDIAN_HOME_FIXTURE.comedianName,
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
        label={t('home.comedian.sameNight', { date: COMEDIAN_HOME_FIXTURE.sameNightDate })}
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
