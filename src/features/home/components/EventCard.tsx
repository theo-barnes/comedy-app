import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { homeCardTypography } from '@/features/home/cardTypography';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import { PlaceholderImage } from './PlaceholderImage';
import type { Theme } from '@/theme/types';

type Props = {
  title: string;
  /** Venue name or any subtitle (e.g. follower count). */
  subtitle: string;
  imageUri?: string;
  onPress?: () => void;
};

export function EventCard({ title, subtitle, imageUri, onPress }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <Card style={styles.card} onPress={onPress ?? (() => {})}>
      <PlaceholderImage uri={imageUri} style={styles.image} />
      <View style={styles.info}>
        <AppText
          variant={homeCardTypography.eventCardTitle.variant}
          style={homeCardTypography.eventCardTitle.style}
          numberOfLines={homeCardTypography.eventCardTitle.numberOfLines}
        >
          {title}
        </AppText>
        <AppText
          variant={homeCardTypography.eventCardSubtitle.variant}
          muted
          numberOfLines={homeCardTypography.eventCardSubtitle.numberOfLines}
        >
          {subtitle}
        </AppText>
      </View>
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      width: 140,
      padding: 0,
      overflow: 'hidden',
      borderRadius: radii.md,
      borderWidth: 0.5,
      borderColor: theme.colors.border,
    },
    image: {
      width: '100%',
      height: 90,
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
    },
    info: {
      padding: spacing.sm,
      gap: 4,
    },
  });
