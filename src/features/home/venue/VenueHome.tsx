import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { EventCard } from '@/features/home/components/EventCard';
import { FilterChips } from '@/features/home/components/FilterChips';
import { HomeScreenLayout } from '@/features/home/components/HomeScreenLayout';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { HOME_SPACING } from '@/features/home/home-spacing';
import type { BadgeVariant } from '@/features/home/components/Badge';

import { ActCard } from './ActCard';
import { EventListItem } from './EventListItem';
import { FeaturedShowCard } from './FeaturedShowCard';

const MOCK_VENUE_DATA = {
  city: 'London',
  featuredShow: {
    title: 'The Moth Invitational',
    venue: 'The Moth Club',
    date: 'Fri, 13 Jun',
    statusBadge: 'onSale' as BadgeVariant,
    ticketsSold: 186,
    totalTickets: 280,
    revenue: '£4,092',
    remaining: 94,
    onWaitlist: 47,
    progress: 186 / 280,
  },
  otherEvents: [
    {
      id: '1',
      title: 'Store Nights: Friday Late',
      venue: 'The Comedy Store',
      date: 'Fri, 6 Jun',
      statusBadge: 'soldOut' as BadgeVariant,
      progress: 1.0,
    },
    {
      id: '2',
      title: 'New Acts Night',
      venue: 'Angel Comedy Club',
      date: 'Sat, 7 Jun',
      statusBadge: 'onSale' as BadgeVariant,
      progress: 0.69,
    },
    {
      id: '3',
      title: 'Thursday Late at the Creek',
      venue: 'Up The Creek',
      date: 'Thu, 5 Jun',
      statusBadge: 'onSale' as BadgeVariant,
      progress: 0.59,
    },
  ],
  actsFilter: ['All', 'Observational', 'Alt-Comedy', 'Storytelling'],
  acts: [
    { id: '1', name: 'Jane Smith', rating: 4.9, tagline: 'Sharp. Absurdist. Unavoidable.' },
    { id: '2', name: 'John Doe', rating: 4.7, tagline: 'Deadpan delivery. Dry as toast.' },
    {
      id: '3',
      name: 'Sarah Brown',
      rating: 4.8,
      tagline: 'Comedy for people with trust issues.',
    },
    {
      id: '4',
      name: 'Tom Jones',
      rating: 4.6,
      tagline: 'Observational. Relentless. Oddly charming.',
    },
  ],
  whatElse: [
    { id: '1', title: 'Store Nights: Friday Late', subtitle: 'The Comedy Store' },
    { id: '2', title: 'New Acts Night', subtitle: 'Angel Comedy Club' },
    { id: '3', title: 'Thursday Late at the Creek', subtitle: 'Up The Creek' },
  ],
};

export function VenueHome() {
  const { t } = useTranslation();
  const [selectedActFilter, setSelectedActFilter] = useState(MOCK_VENUE_DATA.actsFilter[0]);
  const { featuredShow, otherEvents, acts, whatElse } = MOCK_VENUE_DATA;

  return (
    <HomeScreenLayout
      city={MOCK_VENUE_DATA.city}
      heroTitle={t('home.venue.yourShows')}
      heroSubtitle={t('home.venue.salesSummary', {
        title: featuredShow.title,
        percent: Math.round(featuredShow.progress * 100),
      })}
    >
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
        options={MOCK_VENUE_DATA.actsFilter}
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
});
