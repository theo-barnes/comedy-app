import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { radii, spacing } from '@/theme';
import { PlaceholderImage } from './PlaceholderImage';

type Props = {
  name: string;
  /** Venue name, neighbourhood, or follower count depending on context. */
  subtitle: string;
  imageUri?: string;
  onPress?: () => void;
};

export function PerformerCard({ name, subtitle, imageUri, onPress }: Props) {
  return (
    <Card style={styles.card} onPress={onPress ?? (() => {})}>
      <PlaceholderImage uri={imageUri} style={styles.image} />
      <View style={styles.info}>
        <AppText variant="caption" style={styles.name} numberOfLines={2}>
          {name}
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
    flex: 1,
    padding: 0,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  info: {
    padding: spacing.sm,
    gap: 2,
  },
  name: {
    fontWeight: '600',
  },
});
