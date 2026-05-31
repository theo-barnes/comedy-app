import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { EventCard } from '@/features/home/components/EventCard';
import { FilterChips } from '@/features/home/components/FilterChips';
import { HomeHeader } from '@/features/home/components/HomeHeader';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { spacing } from '@/theme';
import type { BadgeVariant } from '@/features/home/components/Badge';

import { ActCard } from './ActCard';
import { EventListItem } from './EventListItem';
import { FeaturedShowCard } from './FeaturedShowCard';

const MOCK_VENUE_DATA = {
  city: 'London',
  notificationCount: 5,
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
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader
          city={MOCK_VENUE_DATA.city}
          role="venue"
          notificationCount={MOCK_VENUE_DATA.notificationCount}
        />

        <View style={styles.titleBlock}>
          <AppText variant="title">{t('home.venue.yourShows')}</AppText>
          <AppText muted>
            {t('home.venue.salesSummary', {
              title: featuredShow.title,
              percent: Math.round(featuredShow.progress * 100),
            })}
          </AppText>
        </View>

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

        {/* YOUR OTHER EVENTS */}
        <SectionHeader
          label={t('home.venue.yourOtherEvents')}
          actionLabel={t('common.seeAll')}
          onAction={() => {}}
        />
        <View style={styles.list}>
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
        <View style={styles.list}>
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
  list: {
    gap: spacing.sm,
  },
  horizontalList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
});
