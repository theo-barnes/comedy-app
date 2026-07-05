import { useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FilterChips } from '@/features/home/components/FilterChips';
import { HomeScreenLayout } from '@/features/home/components/HomeScreenLayout';
import { PerformerCard } from '@/features/home/components/PerformerCard';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { ThisWeekSection } from '@/features/home/fan/ThisWeekSection';
import { HOME_SPACING } from '@/features/home/home-spacing';
import { LocationContext, useHeaderLocationLabel } from '@/features/location';

import {
  CuratorSection,
  FullBillSection,
  LiveNowSection,
  TrendingSection,
  getBrowseConfig,
} from '@/features/browse';

import { useDiscoveryRegions } from '@/lib/api/discovery-regions';
import { useHomeFeed } from '@/lib/api/home-feed';
import { useRouter } from 'expo-router';

import { ClipCard } from './ClipCard';
import { FAN_HOME_FIXTURE } from './fan-home-fixture';
import { selectFanHomeSections } from './fan-home-selectors';
import { FeaturedEventCard } from './FeaturedEventCard';
import { SavedRecommendationItem } from './SavedRecommendationItem';

export function FanHome() {
  const { t } = useTranslation();
  const { featured, becauseYouSaved } = FAN_HOME_FIXTURE;
  const browse = getBrowseConfig('fan');
  const dayLabels = browse.days.map((d) => `${d.day} ${d.date}`);
  const [selectedDay, setSelectedDay] = useState(dayLabels[0] ?? '');
  const { cityLabel } = useHeaderLocationLabel();
  const location = useContext(LocationContext);
  const discoveryRegionsQuery = useDiscoveryRegions(
    location?.latitude ?? null,
    location?.longitude ?? null,
  );
  const homeFeedQuery = useHomeFeed(location?.latitude ?? null, location?.longitude ?? null);
  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState('All');
  const router = useRouter();

  const { thisWeek, performersNearYou, freshClips } = selectFanHomeSections(homeFeedQuery.data);

  const neighbourhoodChips = [
    'All',
    ...Array.from(new Set(discoveryRegionsQuery.data?.regions.map((region) => region.name) ?? [])),
  ];

  return (
    <HomeScreenLayout heroTitle={t('home.fan.findYourNextRoom', { city: cityLabel })}>
      <FilterChips
        options={neighbourhoodChips}
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
