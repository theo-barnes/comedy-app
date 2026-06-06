import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { homeCardTypography } from '@/features/home/cardTypography';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import { PlaceholderImage } from './PlaceholderImage';
import type { Theme } from '@/theme/types';

type Props = {
  name: string;
  /** Venue name, neighbourhood, or follower count depending on context. */
  subtitle: string;
  imageUri?: string;
  onPress?: () => void;
};

export function PerformerCard({ name, subtitle, imageUri, onPress }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <Card style={styles.card} onPress={onPress ?? (() => {})}>
      <PlaceholderImage uri={imageUri} style={styles.image} />
      <View style={styles.info}>
        <AppText
          variant={homeCardTypography.compactNameTitle.variant}
          style={homeCardTypography.compactNameTitle.style}
          numberOfLines={homeCardTypography.compactNameTitle.numberOfLines}
        >
          {name}
        </AppText>
        <AppText
          variant={homeCardTypography.compactTileSubtitle.variant}
          muted
          numberOfLines={homeCardTypography.compactTileSubtitle.numberOfLines}
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
      flex: 1,
      padding: 0,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: theme.colors.border,
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
  });
