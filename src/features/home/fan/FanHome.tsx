import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { FilterChips } from '@/features/home/components/FilterChips';
import { HomeScreenLayout } from '@/features/home/components/HomeScreenLayout';
import { PerformerCard } from '@/features/home/components/PerformerCard';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { ThisWeekSection } from '@/features/home/fan/ThisWeekSection';
import { HOME_SPACING } from '@/features/home/home-spacing';
import type { BadgeVariant } from '@/features/home/components/Badge';
import {
  CuratorSection,
  FullBillSection,
  LiveNowSection,
  TrendingSection,
  getBrowseConfig,
} from '@/features/browse';

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
  const router = useRouter();
  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState(
    MOCK_FAN_DATA.neighbourhoods[0],
  );
  const { featured, thisWeek, performersNearYou, freshClips, becauseYouSaved } = MOCK_FAN_DATA;
  const browse = getBrowseConfig('fan');
  const dayLabels = browse.days.map((d) => `${d.day} ${d.date}`);
  const [selectedDay, setSelectedDay] = useState(dayLabels[0] ?? '');

  return (
    <HomeScreenLayout
      city={MOCK_FAN_DATA.city}
      heroTitle={t('home.fan.tonightRooms')}
      heroSubtitle={t('home.fan.showsNearYou', { count: thisWeek.length + 1 })}
    >
      <FilterChips
        options={MOCK_FAN_DATA.neighbourhoods}
        selected={selectedNeighbourhood}
        onSelect={setSelectedNeighbourhood}
      />

      <View testID="fan-home-featured-section">
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
      </View>

      <View testID="fan-home-this-week-section">
        <ThisWeekSection
          events={thisWeek}
          sectionLabel={t('home.fan.thisWeek')}
          actionLabel={t('common.seeAll')}
          onAction={() => {}}
        />
      </View>

      {/* PERFORMING NEAR YOU */}
      <SectionHeader
        label={t('home.fan.performingNearYou')}
        actionLabel={t('common.seeAll')}
        onAction={() => {}}
      />
      <View style={styles.threeColGrid} testID="fan-home-performers-section">
        {performersNearYou.map((p) => (
          <PerformerCard key={p.id} name={p.name} subtitle={p.subtitle} />
        ))}
      </View>

      {/* FRESH CLIPS */}
      <SectionHeader label={t('home.fan.freshClips')} />
      <View style={styles.twoColGrid} testID="fan-home-clips-section">
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
      <View style={styles.savedList} testID="fan-home-saved-section">
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
  threeColGrid: {
    flexDirection: 'row',
    paddingHorizontal: HOME_SPACING.sectionHorizontalPadding,
    gap: HOME_SPACING.sectionGap,
    marginBottom: HOME_SPACING.sectionBottom,
  },
  twoColGrid: {
    flexDirection: 'row',
    paddingHorizontal: HOME_SPACING.sectionHorizontalPadding,
    gap: HOME_SPACING.sectionGap,
    marginBottom: HOME_SPACING.sectionBottom,
  },
  savedList: {
    gap: HOME_SPACING.sectionGap,
    marginBottom: HOME_SPACING.sectionBottom,
  },
  browseSection: {
    marginBottom: HOME_SPACING.sectionBottom,
  },
});
