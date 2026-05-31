import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Badge, type BadgeVariant } from '@/features/home/components/Badge';
import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';
import { radii, spacing } from '@/theme';

type Props = {
  venue: string;
  date: string;
  roleBadge: BadgeVariant;
  imageUri?: string;
  onPress?: () => void;
};

export function GigListItem({ venue, date, roleBadge, imageUri, onPress }: Props) {
  return (
    <Card style={styles.card} onPress={onPress ?? (() => {})}>
      <PlaceholderImage uri={imageUri} style={styles.image} />
      <View style={styles.content}>
        <AppText variant="body" style={styles.venue} numberOfLines={1}>
          {venue}
        </AppText>
        <AppText variant="caption" muted>
          {date}
        </AppText>
      </View>
      <Badge variant={roleBadge} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 0,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },
  image: {
    width: 60,
    height: 60,
    borderTopLeftRadius: radii.md,
    borderBottomLeftRadius: radii.md,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  venue: {
    fontWeight: '600',
  },
});
