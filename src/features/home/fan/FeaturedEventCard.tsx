import { Pressable, StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { AvatarStack } from '@/features/home/components/AvatarStack';
import { Badge, type BadgeVariant } from '@/features/home/components/Badge';
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
      <View style={styles.bottom}>
        <AppText variant="heading" style={styles.title}>
          {title}
        </AppText>
        <AppText variant="caption" muted>{`${venue} · ${neighbourhood}`}</AppText>
        <View style={styles.metaRow}>
          <AvatarStack avatars={performerAvatars} label={performerLabel} />
          <View style={styles.datePrice}>
            <AppText variant="caption" muted>{`${date}  ·  ${time}`}</AppText>
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
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    title: {
      fontWeight: '700',
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
