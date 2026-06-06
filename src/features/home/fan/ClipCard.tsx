import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { homeCardTypography } from '@/features/home/cardTypography';
import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  title: string;
  comedianName: string;
  viewCount: string;
  duration: string;
  imageUri?: string;
  onPress?: () => void;
};

export function ClipCard({ title, comedianName, viewCount, duration, imageUri, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <Card style={styles.card} onPress={onPress ?? (() => {})}>
      <View style={styles.imageContainer}>
        <PlaceholderImage uri={imageUri} style={styles.image} />
        <View testID="clip-duration-badge" style={styles.durationBadge}>
          <AppText variant="label" style={styles.durationText}>
            {duration}
          </AppText>
        </View>
      </View>
      <View style={styles.info}>
        <AppText
          variant={homeCardTypography.clipCardSubtitle.variant}
          muted
          numberOfLines={homeCardTypography.clipCardSubtitle.numberOfLines}
        >
          {comedianName}
        </AppText>
        <AppText
          variant={homeCardTypography.clipCardTitle.variant}
          style={homeCardTypography.clipCardTitle.style}
          numberOfLines={homeCardTypography.clipCardTitle.numberOfLines}
        >
          {title}
        </AppText>
        <AppText variant="caption" muted>
          {viewCount}
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
    },
    imageContainer: {
      position: 'relative',
    },
    image: {
      width: '100%',
      height: 160,
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
    },
    durationBadge: {
      position: 'absolute',
      bottom: spacing.xs,
      right: spacing.xs,
      backgroundColor: theme.colors.mediaScrimStrong,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    durationText: {
      color: theme.colors.textPrimary,
      fontWeight: '500',
    },
    info: {
      padding: spacing.sm,
      gap: 4,
    },
  });
