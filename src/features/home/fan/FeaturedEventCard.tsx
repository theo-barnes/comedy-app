import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { AvatarStack } from '@/features/home/components/AvatarStack';
import { Badge, type BadgeVariant } from '@/features/home/components/Badge';
import { homeCardTypography } from '@/features/home/cardTypography';
import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';
import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  title: string;
  venue: string;
  neighbourhood: string;
  date: string;
  time: string;
  price: string;
  badges: BadgeVariant[];
  performerAvatars: Array<string | undefined>;
  performerLabel: string;
  imageUri?: string;
};

export function FeaturedEventCard({
  title,
  venue,
  neighbourhood,
  date,
  time,
  price,
  badges,
  performerAvatars,
  performerLabel,
  imageUri,
}: Props) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <PlaceholderImage uri={imageUri} style={styles.absoluteFill} />
      {/* Top row: badges + save button */}
      <View style={styles.topRow}>
        <View style={styles.badgeRow}>
          {badges.map((b) => (
            <Badge key={b} variant={b} />
          ))}
        </View>
        <Pressable style={styles.saveButton} accessibilityLabel="Save show">
          <Ionicons name="heart-outline" size={22} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
      {/* Bottom info */}
      <View testID="featured-event-bottom-overlay" style={styles.bottom}>
        <AppText
          variant={homeCardTypography.featuredTitle.variant}
          style={homeCardTypography.featuredTitle.style}
          numberOfLines={homeCardTypography.featuredTitle.numberOfLines}
        >
          {title}
        </AppText>
        <AppText
          variant={homeCardTypography.featuredMeta.variant}
          muted
          numberOfLines={homeCardTypography.featuredMeta.numberOfLines}
        >{`${venue} · ${neighbourhood}`}</AppText>
        <View style={styles.metaRow}>
          <AvatarStack avatars={performerAvatars} label={performerLabel} />
          <View style={styles.datePrice}>
            <AppText
              variant={homeCardTypography.featuredMeta.variant}
              muted
              numberOfLines={homeCardTypography.featuredMeta.numberOfLines}
            >{`${date}  ·  ${time}`}</AppText>
            <AppText variant="body" style={styles.price}>
              {price}
            </AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      height: 300,
      borderRadius: radii.lg,
      overflow: 'hidden',
      backgroundColor: theme.colors.card,
      justifyContent: 'space-between',
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      marginBottom: spacing.md,
    },
    absoluteFill: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: spacing.md,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
      flex: 1,
    },
    saveButton: {
      marginLeft: spacing.sm,
    },
    bottom: {
      padding: spacing.md,
      gap: spacing.xs,
      backgroundColor: theme.colors.mediaScrimSoft,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    datePrice: {
      alignItems: 'flex-end',
      gap: 2,
    },
    price: {
      color: theme.colors.primaryRest,
      fontWeight: '700',
    },
  });
