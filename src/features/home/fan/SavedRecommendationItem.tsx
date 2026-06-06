import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Badge, type BadgeVariant } from '@/features/home/components/Badge';
import { homeCardTypography } from '@/features/home/cardTypography';
import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  title: string;
  venue: string;
  neighbourhood: string;
  date: string;
  price: string;
  badges: BadgeVariant[];
  imageUri?: string;
  onPress?: () => void;
};

export function SavedRecommendationItem({
  title,
  venue,
  neighbourhood,
  date,
  price,
  badges,
  imageUri,
  onPress,
}: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <Card style={styles.card} onPress={onPress ?? (() => {})}>
      <PlaceholderImage uri={imageUri} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.badgeRow}>
          {badges.map((b) => (
            <Badge key={b} variant={b} />
          ))}
        </View>
        <AppText
          variant={homeCardTypography.compactTileTitle.variant}
          style={homeCardTypography.compactTileTitle.style}
          numberOfLines={homeCardTypography.compactTileTitle.numberOfLines}
        >
          {title}
        </AppText>
        <AppText
          variant={homeCardTypography.rowSubtitle.variant}
          muted
          numberOfLines={homeCardTypography.rowSubtitle.numberOfLines}
        >{`${venue} · ${neighbourhood}`}</AppText>
        <View style={styles.metaRow}>
          <AppText variant={homeCardTypography.rowSubtitle.variant} muted>
            {date}
          </AppText>
          <AppText variant="caption" style={styles.price}>
            {price}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      padding: 0,
      overflow: 'hidden',
      marginHorizontal: spacing.lg,
    },
    image: {
      width: 72,
      borderTopLeftRadius: radii.md,
      borderBottomLeftRadius: radii.md,
    },
    content: {
      flex: 1,
      padding: spacing.sm,
      gap: 4,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 2,
    },
    price: {
      color: theme.colors.primaryRest,
      fontWeight: '600',
    },
  });
