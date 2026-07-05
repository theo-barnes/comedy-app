import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { EventCard } from '@/features/home/components/EventCard';
import { FilterChips } from '@/features/home/components/FilterChips';
import { HomeScreenLayout } from '@/features/home/components/HomeScreenLayout';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { HOME_SPACING } from '@/features/home/home-spacing';
import {
  CuratorSection,
  FullBillSection,
  LiveNowSection,
  TrendingSection,
  getBrowseConfig,
} from '@/features/browse';

import { ActCard } from './ActCard';
import { EventListItem } from './EventListItem';
import { FeaturedShowCard } from './FeaturedShowCard';
import { VENUE_HOME_FIXTURE } from './venue-home-fixture';

export function VenueHome() {
  const { t } = useTranslation();
  const router = useRouter();
  const [selectedActFilter, setSelectedActFilter] = useState(
    VENUE_HOME_FIXTURE.actsFilter[0] ?? '',
  );
  const { featuredShow, otherEvents, acts, whatElse } = VENUE_HOME_FIXTURE;
  const browse = getBrowseConfig('venue');
  const dayLabels = browse.days.map((d) => `${d.day} ${d.date}`);
  const [selectedDay, setSelectedDay] = useState(dayLabels[0] ?? '');

  return (
    <HomeScreenLayout heroTitle={t('home.venue.yourShows')}>
      <View style={styles.featuredSection} testID="venue-home-featured-section">
        <FeaturedShowCard
          title={featuredShow.title}
          venue={featuredShow.venue}
          date={featuredShow.date}
          statusBadge={featuredShow.statusBadge}
          ticketsSold={featuredShow.ticketsSold}
          totalTickets={featuredShow.totalTickets}
          revenue={featuredShow.revenue}
          remaining={featuredShow.remaining}
          onWaitlist={featuredShow.onWaitlist}
          progress={featuredShow.progress}
        />
      </View>

      {/* YOUR OTHER EVENTS */}
      <SectionHeader
        label={t('home.venue.yourOtherEvents')}
        actionLabel={t('common.seeAll')}
        onAction={() => {}}
      />
      <View style={styles.list} testID="venue-home-other-events-section">
        {otherEvents.map((e) => (
          <EventListItem
            key={e.id}
            title={e.title}
            venue={e.venue}
            date={e.date}
            statusBadge={e.statusBadge}
            progress={e.progress}
          />
        ))}
      </View>

      {/* FIND ACTS TO BOOK */}
      <SectionHeader
        label={t('home.venue.findActs')}
        actionLabel={t('home.venue.browseAll')}
        onAction={() => {}}
      />
      <FilterChips
        options={VENUE_HOME_FIXTURE.actsFilter}
        selected={selectedActFilter}
        onSelect={setSelectedActFilter}
      />
      <View style={styles.list} testID="venue-home-acts-section">
        {acts.map((act) => (
          <ActCard key={act.id} name={act.name} rating={act.rating} tagline={act.tagline} />
        ))}
      </View>

      {/* WHAT ELSE IS ON THIS WEEK */}
      <SectionHeader label={t('home.venue.whatElseOn')} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
      >
        {whatElse.map((e) => (
          <EventCard key={e.id} title={e.title} subtitle={e.subtitle} />
        ))}
      </ScrollView>

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
  list: {
    gap: HOME_SPACING.sectionGap,
    marginBottom: HOME_SPACING.sectionBottom,
  },
  horizontalList: {
    paddingHorizontal: HOME_SPACING.sectionHorizontalPadding,
    gap: HOME_SPACING.sectionGap,
    paddingBottom: HOME_SPACING.sectionBottom,
  },
  browseSection: {
    marginBottom: HOME_SPACING.sectionBottom,
  },
});
