import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Badge, type BadgeVariant } from '@/features/home/components/Badge';
import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';
import { colors, radii, spacing } from '@/theme';

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
  return (
    <Card style={styles.card} onPress={onPress ?? (() => {})}>
      <PlaceholderImage uri={imageUri} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.badgeRow}>
          {badges.map((b) => (
            <Badge key={b} variant={b} />
          ))}
        </View>
        <AppText variant="body" style={styles.title} numberOfLines={2}>
          {title}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1}>{`${venue} · ${neighbourhood}`}</AppText>
        <View style={styles.metaRow}>
          <AppText variant="caption" muted>
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

const styles = StyleSheet.create({
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
  title: {
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  price: {
    color: colors.primary,
    fontWeight: '600',
  },
});
