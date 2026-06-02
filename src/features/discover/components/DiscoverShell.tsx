import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ComponentType } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { FilterChips } from '@/features/home/components/FilterChips';
import { FeaturedEventCard } from '@/features/home/fan/FeaturedEventCard';
import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme';
import type { Theme } from '@/theme/types';

import { CuratorSection, FullBillSection, LiveNowSection, TrendingSection } from './BrowseSections';
import { ClipsFeed } from './ClipsFeed';
import type { DiscoverConfig, DiscoverView } from '../types';

type Props = {
  config: DiscoverConfig;
  avatarUri?: string;
};

type ViewRendererProps = {
  config: DiscoverConfig;
  colorScheme: Theme['colorScheme'];
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

  const styles = useMemo(() => createStyles(theme, activeView), [theme, activeView]);
  const ActiveView = VIEW_RENDERERS[activeView];

  return (
    <Screen>
      <View style={styles.root}>
        <ScreenHeader city={config.city} tabLabel="Discover" avatarUri={avatarUri} />

        <View style={styles.modeSwitcherRow}>
          <View style={styles.modeSwitcher}>
            {config.modes.map((mode) => {
              const selected = activeView === mode.id;
              return (
                <Pressable
                  key={mode.id}
                  onPress={() => setActiveView(mode.id)}
                  style={[styles.modeButton, selected && styles.modeButtonActive]}
                >
                  <Ionicons
                    name={mode.icon}
                    size={16}
                    color={selected ? theme.colors.onPrimary : theme.colors.textMuted}
                  />
                  <AppText style={[styles.modeLabel, selected && styles.modeLabelActive]}>
                    {mode.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {activeView === 'clips' && (
          <View style={styles.clipsTabs}>
            {config.clips.categories.map((category) => {
              const selected = activeClipCategory === category;
              return (
                <Pressable
                  key={category}
                  style={styles.clipTabButton}
                  onPress={() => setActiveClipCategory(category)}
                >
                  <AppText style={[styles.clipTabLabel, selected && styles.clipTabLabelActive]}>
                    {category}
                  </AppText>
                  <View
                    style={[styles.clipTabUnderline, selected && styles.clipTabUnderlineActive]}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        <ActiveView
          config={config}
          colorScheme={theme.colorScheme}
          iconColor={theme.colors.textMuted}
        />
      </View>
    </Screen>
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
      paddingBottom: spacing.xl,
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

const createStyles = (theme: Theme, view: DiscoverView) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: view === 'clips' ? theme.colors.surface : '#F5F3EE',
    },
    modeSwitcherRow: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      alignItems: 'flex-end',
    },
    modeSwitcher: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: view === 'clips' ? theme.colors.card : '#EEEBE4',
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: view === 'clips' ? theme.colors.border : 'rgba(0,0,0,0.06)',
      padding: 3,
      gap: 3,
    },
    modeButton: {
      height: 36,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    modeButtonActive: {
      backgroundColor: view === 'clips' ? theme.colors.primaryRest : '#1A1A1A',
    },
    modeLabel: {
      color: view === 'clips' ? theme.colors.textMuted : '#6B6B6B',
      fontWeight: '600',
    },
    modeLabelActive: {
      color: view === 'clips' ? theme.colors.onPrimary : '#FFFFFF',
    },
    clipsTabs: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      alignItems: 'center',
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: view === 'clips' ? theme.colors.border : 'rgba(255,255,255,0.08)',
    },
    clipTabButton: {
      alignItems: 'center',
      minWidth: 90,
    },
    clipTabLabel: {
      color: theme.colors.textMuted,
      fontSize: 30 / 2,
      fontWeight: '600',
      marginBottom: 10,
    },
    clipTabLabelActive: {
      color: theme.colors.textPrimary,
    },
    clipTabUnderline: {
      height: 2,
      width: '100%',
      backgroundColor: 'transparent',
    },
    clipTabUnderlineActive: {
      backgroundColor: theme.colors.primaryRest,
    },
  });
