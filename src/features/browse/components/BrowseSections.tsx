import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Badge } from '@/features/home/components/Badge';
import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';
import { SectionHeader } from '@/features/home/components/SectionHeader';
import { SavedRecommendationItem } from '@/features/home/fan/SavedRecommendationItem';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme';
import type { Theme } from '@/theme/types';

import type { BrowseShow, CuratorSpotlight, LiveNowPanel } from '../types';

type TrendingSectionProps = {
  sectionTitle: string;
  shows: BrowseShow[];
};

type CuratorSectionProps = {
  curator: CuratorSpotlight;
};

type FullBillSectionProps = {
  sectionTitle: string;
  shows: BrowseShow[];
  onMapPress?: () => void;
};

type LiveNowSectionProps = {
  panel: LiveNowPanel;
};

export function TrendingSection({ sectionTitle, shows }: TrendingSectionProps) {
  return (
    <View>
      <SectionHeader label={sectionTitle} actionLabel="See all" onAction={() => {}} />
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={sharedStyles.trendingRow}
      >
        {shows.map((show) => (
          <TrendingShowCard key={show.id} show={show} />
        ))}
      </ScrollView>
    </View>
  );
}

export function CuratorSection({ curator }: CuratorSectionProps) {
  const styles = useThemedStyles(createSpotlightStyles);
  return (
    <View>
      <SectionHeader label="This Week's Spotlight" />
      <View style={sharedStyles.cardWrap}>
        <Card>
          <AppText variant="caption" style={styles.kicker}>
            • {curator.kicker}
          </AppText>
          <AppText variant="heading" style={styles.title}>
            {curator.title}
          </AppText>
        </Card>
      </View>
    </View>
  );
}

export function FullBillSection({ sectionTitle, shows, onMapPress }: FullBillSectionProps) {
  return (
    <View>
      <SectionHeader
        label={sectionTitle}
        actionLabel="See all"
        onAction={() => {}}
        iconAction={
          onMapPress
            ? {
                iconName: 'map-outline',
                onPress: onMapPress,
                accessibilityLabel: 'View on map',
              }
            : undefined
        }
      />
      <View style={sharedStyles.billStack}>
        {shows.map((show) => (
          <SavedRecommendationItem
            key={show.id}
            title={show.title}
            venue={show.venue}
            neighbourhood={show.neighbourhood}
            date={show.date}
            price={show.price}
            badges={show.badges ?? []}
            imageUri={show.imageUri}
          />
        ))}
      </View>
    </View>
  );
}

export function LiveNowSection({ panel }: LiveNowSectionProps) {
  const styles = useThemedStyles(createLiveStyles);
  return (
    <View>
      <SectionHeader label={panel.kicker} />
      <View style={styles.wrap}>
        {/* Live Now panel is intentionally always-dark — a real-time accent regardless of system theme */}
        <View testID="live-now-panel" style={styles.panel}>
          <AppText testID="live-now-time-label" variant="caption" style={styles.timeLabel}>
            {panel.timeLabel}
          </AppText>
          <AppText testID="live-now-title" variant="heading" style={styles.title}>
            {panel.title}
          </AppText>
          <View style={styles.venueStack}>
            {panel.venues.map((venue, index) => (
              <VenueAvailabilityRow
                key={venue.name}
                rowIndex={index}
                name={venue.name}
                value={venue.value}
              />
            ))}
          </View>
        </View>
        <Pressable style={styles.ctaButton}>
          <AppText variant="body" style={styles.ctaText}>
            {panel.cta} →
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

type TrendingShowCardProps = {
  show: BrowseShow;
};

function TrendingShowCard({ show }: TrendingShowCardProps) {
  const styles = useThemedStyles(createCardStyles);
  return (
    <Card style={styles.card}>
      <PlaceholderImage uri={show.imageUri} style={styles.image} />
      <View style={styles.body}>
        {show.badges?.length ? (
          <View style={styles.badgeRow}>
            {show.badges.map((b) => (
              <Badge key={b} variant={b} />
            ))}
          </View>
        ) : null}
        <AppText variant="heading" style={styles.title} numberOfLines={2}>
          {show.title}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1}>
          {show.venue} · {show.neighbourhood}
        </AppText>
        <View style={styles.footer}>
          <AppText variant="caption" muted>
            {show.date}
          </AppText>
          <AppText variant="caption" style={styles.price}>
            {show.price}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

type VenueAvailabilityRowProps = {
  rowIndex: number;
  name: string;
  value: string;
};

function VenueAvailabilityRow({ rowIndex, name, value }: VenueAvailabilityRowProps) {
  const styles = useThemedStyles(createVenueRowStyles);
  return (
    <View testID={`live-now-row-${rowIndex}`} style={styles.row}>
      <AppText testID={`live-now-row-name-${rowIndex}`} variant="caption" style={styles.name}>
        {name}
      </AppText>
      <AppText testID={`live-now-row-value-${rowIndex}`} variant="caption" style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const sharedStyles = StyleSheet.create({
  trendingRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  cardWrap: {
    paddingHorizontal: spacing.lg,
  },
  billStack: {
    gap: spacing.xs,
  },
});

const createCardStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      width: 220,
      padding: 0,
      overflow: 'hidden',
    },
    image: {
      width: '100%',
      height: 140,
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
    },
    body: {
      padding: spacing.sm,
      gap: 2,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
      marginBottom: 2,
    },
    title: {
      fontWeight: '700',
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    price: {
      color: theme.colors.primaryRest,
      fontWeight: '700',
    },
  });

const createSpotlightStyles = (theme: Theme) =>
  StyleSheet.create({
    kicker: {
      color: theme.colors.primaryRest,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: spacing.xs,
    },
    title: {
      fontWeight: '700',
    },
  });

const createLiveStyles = (theme: Theme) =>
  StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    panel: {
      borderRadius: radii.lg,
      backgroundColor: theme.colors.livePanelSurface,
      padding: spacing.md,
      gap: spacing.sm,
    },
    timeLabel: {
      color: theme.colors.livePanelTextMuted,
      letterSpacing: 1.5,
      alignSelf: 'flex-end',
    },
    title: {
      color: theme.colors.livePanelTextPrimary,
      fontWeight: '700',
    },
    venueStack: {
      gap: spacing.xs,
    },
    ctaButton: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: {
      fontWeight: '700',
    },
  });

const createVenueRowStyles = (_theme: Theme) =>
  StyleSheet.create({
    row: {
      borderRadius: radii.sm,
      backgroundColor: _theme.colors.livePanelRow,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    name: {
      color: _theme.colors.livePanelTextPrimary,
      fontWeight: '600',
    },
    value: {
      color: _theme.colors.livePanelAccent,
      fontWeight: '700',
    },
  });
