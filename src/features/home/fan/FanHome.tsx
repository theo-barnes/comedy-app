import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EventCard } from '@/features/home/components/EventCard';
import { FilterChips } from '@/features/home/components/FilterChips';
import { PerformerCard } from '@/features/home/components/PerformerCard';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { spacing } from '@/theme';
import type { BadgeVariant } from '@/features/home/components/Badge';

import { ClipCard } from './ClipCard';
import { FeaturedEventCard } from './FeaturedEventCard';
import { SavedRecommendationItem } from './SavedRecommendationItem';

const MOCK_FAN_DATA = {
  city: 'London',
  neighbourhoods: ['All', 'Soho', 'Islington', 'Hackney', 'Greenwich'],
  featured: {
    title: 'Store Nights: Friday Late',
    venue: 'The Comedy Store',
    neighbourhood: 'Soho',
    date: 'Fri, 6 Jun',
    time: '9:00 PM',
    price: '£18',
    badges: ['hotTicket', 'lateNight', 'soldOut'] as BadgeVariant[],
    performerAvatars: [undefined, undefined, undefined] as Array<string | undefined>,
    performerLabel: '3 performers',
  },
  thisWeek: [
    { id: '1', title: 'Store Nights: Friday Late', subtitle: 'The Comedy Store · Soho' },
    { id: '2', title: 'New Acts Night', subtitle: 'Angel Comedy Club' },
    { id: '3', title: 'Thursday Late at the Creek', subtitle: 'Up The Creek · Greenwich' },
  ],
  performersNearYou: [
    { id: '1', name: 'Jane Smith', subtitle: 'The Comedy Store' },
    { id: '2', name: 'John Doe', subtitle: 'Up The Creek' },
    { id: '3', name: 'Sarah Brown', subtitle: 'Angel Comedy Club' },
  ],
  freshClips: [
    {
      id: '1',
      title: 'The Algorithm Knows Too Much',
      comedianName: 'Jane Smith',
      viewCount: '128K views',
      duration: '3:42',
    },
    {
      id: '2',
      title: 'Peckham Is My Trauma Response',
      comedianName: 'John Doe',
      viewCount: '84K views',
      duration: '4:17',
    },
  ],
  becauseYouSaved: {
    name: 'Jane',
    items: [
      {
        id: '1',
        title: 'Thursday Late at the Creek',
        venue: 'Up The Creek',
        neighbourhood: 'Greenwich',
        date: 'Thu, 5 Jun',
        price: '£10',
        badges: ['weekly', 'lateNight'] as BadgeVariant[],
      },
      {
        id: '2',
        title: 'The Moth Invitational',
        venue: 'The Moth Club',
        neighbourhood: 'Hackney',
        date: 'Fri, 13 Jun',
        price: '£22',
        badges: ['curated', 'premium'] as BadgeVariant[],
      },
    ],
  },
};

export function FanHome() {
  const { t } = useTranslation();
  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState(
    MOCK_FAN_DATA.neighbourhoods[0],
  );
  const { featured, thisWeek, performersNearYou, freshClips, becauseYouSaved } = MOCK_FAN_DATA;

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader city={MOCK_FAN_DATA.city} tabLabel="Home" />

        <View style={styles.titleBlock}>
          <AppText variant="title">{t('home.fan.tonightRooms')}</AppText>
          <AppText muted>{t('home.fan.showsNearYou', { count: thisWeek.length + 1 })}</AppText>
        </View>

        <FilterChips
          options={MOCK_FAN_DATA.neighbourhoods}
          selected={selectedNeighbourhood}
          onSelect={setSelectedNeighbourhood}
        />

        <FeaturedEventCard
          title={featured.title}
          venue={featured.venue}
          neighbourhood={featured.neighbourhood}
          date={featured.date}
          time={featured.time}
          price={featured.price}
          badges={featured.badges}
          performerAvatars={featured.performerAvatars}
          performerLabel={featured.performerLabel}
        />

        {/* THIS WEEK */}
        <SectionHeader
          label={t('home.fan.thisWeek')}
          actionLabel={t('common.seeAll')}
          onAction={() => {}}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        >
          {thisWeek.map((event) => (
            <EventCard key={event.id} title={event.title} subtitle={event.subtitle} />
          ))}
        </ScrollView>

        {/* PERFORMING NEAR YOU */}
        <SectionHeader
          label={t('home.fan.performingNearYou')}
          actionLabel={t('common.seeAll')}
          onAction={() => {}}
        />
        <View style={styles.threeColGrid}>
          {performersNearYou.map((p) => (
            <PerformerCard key={p.id} name={p.name} subtitle={p.subtitle} />
          ))}
        </View>

        {/* FRESH CLIPS */}
        <SectionHeader label={t('home.fan.freshClips')} actionLabel="Browse" onAction={() => {}} />
        <View style={styles.twoColGrid}>
          {freshClips.map((clip) => (
            <ClipCard
              key={clip.id}
              title={clip.title}
              comedianName={clip.comedianName}
              viewCount={clip.viewCount}
              duration={clip.duration}
            />
          ))}
        </View>

        {/* BECAUSE YOU SAVED */}
        <SectionHeader
          label={t('home.fan.becauseYouSaved', { name: becauseYouSaved.name.toUpperCase() })}
          actionLabel="More"
          onAction={() => {}}
        />
        <View style={styles.savedList}>
          {becauseYouSaved.items.map((item) => (
            <SavedRecommendationItem
              key={item.id}
              title={item.title}
              venue={item.venue}
              neighbourhood={item.neighbourhood}
              date={item.date}
              price={item.price}
              badges={item.badges}
            />
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
  },
  titleBlock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  horizontalList: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  threeColGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  twoColGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  savedList: {
    gap: spacing.sm,
  },
});
