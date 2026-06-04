import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { FilterChips } from '@/features/home/components/FilterChips';
import { FeaturedEventCard } from '@/features/home/fan/FeaturedEventCard';
import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme';
import type { Theme } from '@/theme/types';

import { CuratorSection, FullBillSection, LiveNowSection, TrendingSection } from './BrowseSections';
import { ClipsFeed } from './ClipsFeed';
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
  const { theme } = useTheme();
  const [activeView, setActiveView] = useState<DiscoverView>(config.defaultView);
  const [activeClipCategory, setActiveClipCategory] = useState(config.clips.defaultCategory);

  const ActiveView = VIEW_RENDERERS[activeView];

  return (
    <DiscoverScreenLayout
      config={config}
      activeView={activeView}
      onViewChange={setActiveView}
      activeClipCategory={activeClipCategory}
      onClipCategoryChange={setActiveClipCategory}
      avatarUri={avatarUri}
    >
      <ActiveView config={config} iconColor={theme.colors.textMuted} />
    </DiscoverScreenLayout>
  );
}

function BrowseView({ config, iconColor }: ViewRendererProps) {
  const browseStyles = useThemedStyles(createBrowseViewStyles);
  const dayLabels = config.browse.days.map((d) => `${d.day} ${d.date}`);
  const [selectedDay, setSelectedDay] = useState(dayLabels[1] ?? dayLabels[0] ?? '');

  return (
    <ScrollView style={stylesSheet.flex} contentContainerStyle={browseStyles.scrollContent}>
      {/* Search */}
      <View style={browseStyles.searchWrap}>
        <Card style={browseStyles.searchCard}>
          <Ionicons name="search-outline" size={18} color={iconColor} />
          <AppText variant="caption" style={browseStyles.searchText}>
            {config.browse.searchPlaceholder}
          </AppText>
        </Card>
      </View>

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

function MapView({ config, iconColor }: ViewRendererProps) {
  return (
    <View style={stylesSheet.flex}>
      <View style={stylesSheet.searchRow}>
        <View style={stylesSheet.searchInputLike}>
          <Ionicons name="search-outline" size={20} color={iconColor} />
          <AppText style={stylesSheet.searchText}>{config.map.searchPlaceholder}</AppText>
        </View>
        <Pressable style={stylesSheet.iconFilterButton}>
          <Ionicons name="options-outline" size={20} color={iconColor} />
        </Pressable>
      </View>

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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInputLike: {
    flex: 1,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchText: {
    color: '#6B6B6B',
    fontSize: 30 / 2,
  },
  iconFilterButton: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
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

const createBrowseViewStyles = (theme: Theme) =>
  StyleSheet.create({
    scrollContent: {
      gap: spacing.sm,
    },
    searchWrap: {
      paddingHorizontal: spacing.lg,
    },
    searchCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    searchText: {
      flex: 1,
      color: theme.colors.textMuted,
    },
    heroBlock: {
      paddingHorizontal: spacing.lg,
    },
  });
