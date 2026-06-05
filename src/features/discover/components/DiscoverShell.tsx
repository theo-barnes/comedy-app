import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '@/components/AppText';
import { FilterChips } from '@/features/home/components/FilterChips';
import { FeaturedEventCard } from '@/features/home/fan/FeaturedEventCard';
import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme';
import type { Theme } from '@/theme/types';

import { CuratorSection, FullBillSection, LiveNowSection, TrendingSection } from './BrowseSections';
import { ClipsFeed } from './ClipsFeed';
import { DiscoverSegmentedActionBar } from './DiscoverSegmentedActionBar';
import { DiscoverScreenLayout } from './DiscoverScreenLayout';
import type { DiscoverConfig, DiscoverView } from '../types';

type Props = {
  config: DiscoverConfig;
  avatarUri?: string;
};

type ViewRendererProps = {
  config: DiscoverConfig;
  iconColor: string;
};

const VIEW_RENDERERS: Record<DiscoverView, ComponentType<ViewRendererProps>> = {
  browse: BrowseView,
  clips: ClipsView,
  map: MapView,
};

export function DiscoverShell({ config, avatarUri }: Props) {
  const router = useRouter();
  const { theme } = useTheme();
  const [activeView, setActiveView] = useState<DiscoverView>(config.defaultView);

  const ActiveView = VIEW_RENDERERS[activeView];

  const searchDestinationByView: Record<DiscoverView, string> = {
    browse: 'browse',
    clips: 'clips',
    map: 'map',
  };

  function handleSearchPress(view: DiscoverView) {
    router.push({
      pathname: '/discover-search',
      params: {
        context: searchDestinationByView[view],
      },
    });
  }

  function handleFilterPress(view: DiscoverView) {
    if (view !== 'map') return;

    router.push({
      pathname: '/discover-search',
      params: {
        context: 'map-filter',
      },
    });
  }

  return (
    <DiscoverScreenLayout
      config={config}
      activeView={activeView}
      avatarUri={avatarUri}
      topControls={
        <DiscoverSegmentedActionBar
          modes={config.modes}
          activeView={activeView}
          onViewChange={setActiveView}
          onSearchPress={handleSearchPress}
          onFilterPress={handleFilterPress}
          filterEnabled={activeView === 'map'}
        />
      }
    >
      <ActiveView config={config} iconColor={theme.colors.textMuted} />
    </DiscoverScreenLayout>
  );
}

function BrowseView({ config }: ViewRendererProps) {
  const browseStyles = useThemedStyles(createBrowseViewStyles);
  const dayLabels = config.browse.days.map((d) => `${d.day} ${d.date}`);
  const [selectedDay, setSelectedDay] = useState(dayLabels[1] ?? dayLabels[0] ?? '');

  return (
    <ScrollView style={stylesSheet.flex} contentContainerStyle={browseStyles.scrollContent}>
      {/* Hero title */}
      <View style={browseStyles.heroBlock}>
        <AppText variant="title">{config.browse.heroTitle}</AppText>
      </View>

      {/* Day filter */}
      <FilterChips options={dayLabels} selected={selectedDay} onSelect={setSelectedDay} />

      {/* Featured gig */}
      <FeaturedEventCard
        title={config.browse.featuredGig.title}
        venue={config.browse.featuredGig.venue}
        neighbourhood={config.browse.featuredGig.neighbourhood}
        date={config.browse.featuredGig.date}
        time={config.browse.featuredGig.time}
        price={config.browse.featuredGig.price}
        badges={config.browse.featuredGig.badges}
        performerAvatars={[]}
        performerLabel={config.browse.featuredGig.performerLabel}
        imageUri={config.browse.featuredGig.imageUri}
      />

      <TrendingSection sectionTitle="Trending Tonight" shows={config.browse.trendingShows} />
      <CuratorSection curator={config.browse.curator} />
      <FullBillSection sectionTitle="The Full Bill" shows={config.browse.fullBillShows} />
      <LiveNowSection panel={config.browse.liveNow} />
    </ScrollView>
  );
}

function ClipsView({ config }: ViewRendererProps) {
  return <ClipsFeed items={config.clips.feed} />;
}

function MapView({ config }: ViewRendererProps) {
  return (
    <View style={stylesSheet.flex}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={stylesSheet.filterRowContent}
      >
        {config.map.filters.map((filter, index) => (
          <Pressable
            key={filter}
            style={[stylesSheet.filterChip, index === 0 && stylesSheet.filterChipActive]}
          >
            <AppText
              style={[stylesSheet.filterChipText, index === 0 && stylesSheet.filterChipTextActive]}
            >
              {filter}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={stylesSheet.mapCanvas}>
        <View style={stylesSheet.zoomControls}>
          <Pressable style={stylesSheet.zoomButton}>
            <Ionicons name="add" size={24} color="#262626" />
          </Pressable>
          <View style={stylesSheet.zoomDivider} />
          <Pressable style={stylesSheet.zoomButton}>
            <Ionicons name="remove" size={24} color="#262626" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const stylesSheet = StyleSheet.create({
  flex: {
    flex: 1,
  },
  filterRowContent: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    height: 38,
    borderRadius: radii.pill,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  filterChipActive: {
    backgroundColor: '#1A1A1A',
  },
  filterChipText: {
    color: '#2D2D2D',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  mapCanvas: {
    flex: 1,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: '#F5F3EE',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: spacing.md,
  },
  zoomControls: {
    width: 54,
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  zoomButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
});

const createBrowseViewStyles = (_theme: Theme) =>
  StyleSheet.create({
    scrollContent: {
      gap: spacing.sm,
    },
    heroBlock: {
      paddingHorizontal: spacing.lg,
    },
  });
