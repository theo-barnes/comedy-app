import { useContext, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ExpandingSearchBar } from '@/components/ExpandingSearchBar';
import { FilterChips } from '@/features/home/components/FilterChips';
import { HomeScreenLayout } from '@/features/home/components/HomeScreenLayout';
import { PerformerCard } from '@/features/home/components/PerformerCard';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { ThisWeekSection } from '@/features/home/fan/ThisWeekSection';
import { HOME_SPACING } from '@/features/home/home-spacing';
import { LocationContext } from '@/features/location';
import { navigationTabs } from '@/theme/tokens';

import { useDiscoveryRegions } from '@/lib/api/discovery-regions';
import { useHomeFeed } from '@/lib/api/home-feed';

import { ClipCard } from './ClipCard';
import { selectFanHomeSections } from './fan-home-selectors';

export function FanHome() {
  const { t } = useTranslation();
  const location = useContext(LocationContext);
  const discoveryRegionsQuery = useDiscoveryRegions(
    location?.latitude ?? null,
    location?.longitude ?? null,
  );
  const homeFeedQuery = useHomeFeed(location?.latitude ?? null, location?.longitude ?? null);
  const [selectedNeighbourhood, setSelectedNeighbourhood] = useState('All');
  // Captured for a later change that filters the feed by query.
  const [searchQuery, setSearchQuery] = useState('');

  const { thisWeek, performersNearYou, freshClips } = selectFanHomeSections(homeFeedQuery.data);

  const neighbourhoodChips = [
    'All',
    ...Array.from(new Set(discoveryRegionsQuery.data?.regions.map((region) => region.name) ?? [])),
  ];

  return (
    <HomeScreenLayout>
      <ExpandingSearchBar
        style={styles.filterRow}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onSubmit={setSearchQuery}
      >
        <FilterChips
          options={neighbourhoodChips}
          selected={selectedNeighbourhood}
          onSelect={setSelectedNeighbourhood}
        />
      </ExpandingSearchBar>

      {thisWeek.length > 0 && (
        <View testID="fan-home-this-week-section">
          <ThisWeekSection
            events={thisWeek}
            sectionLabel={t('home.fan.thisWeek')}
            actionLabel={t('common.seeAll')}
            onAction={() => {}}
          />
        </View>
      )}

      {performersNearYou.length > 0 && (
        <>
          <SectionHeader
            label={t('home.fan.performingNearYou')}
            actionLabel={t('common.seeAll')}
            onAction={() => {}}
          />
          <View style={styles.threeColGrid} testID="fan-home-performers-section">
            {performersNearYou.map((performer) => (
              <PerformerCard
                key={performer.id}
                name={performer.name}
                subtitle={performer.subtitle}
              />
            ))}
          </View>
        </>
      )}

      {freshClips.length > 0 && (
        <>
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
        </>
      )}
    </HomeScreenLayout>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    paddingHorizontal: navigationTabs.containerHorizontalPadding,
    paddingTop: navigationTabs.containerTopPadding,
  },
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
});
