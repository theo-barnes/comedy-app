import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { radii, spacing } from '@/theme';
import { PlaceholderImage } from './PlaceholderImage';

type Props = {
  title: string;
  /** Venue name or any subtitle (e.g. follower count). */
  subtitle: string;
  imageUri?: string;
  onPress?: () => void;
};

export function EventCard({ title, subtitle, imageUri, onPress }: Props) {
  return (
    <Card style={styles.card} onPress={onPress ?? (() => {})}>
      <PlaceholderImage uri={imageUri} style={styles.image} />
      <View style={styles.info}>
        <AppText variant="caption" style={styles.title} numberOfLines={2}>
          {title}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    padding: 0,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 90,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  info: {
    padding: spacing.sm,
    gap: 2,
  },
  title: {
    fontWeight: '600',
  },
});
