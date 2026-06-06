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
  venue: string;
  date: string;
  roleBadge: BadgeVariant;
  imageUri?: string;
  onPress?: () => void;
};

export function GigListItem({ venue, date, roleBadge, imageUri, onPress }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <Card style={styles.card} onPress={onPress ?? (() => {})}>
      <PlaceholderImage uri={imageUri} style={styles.image} />
      <View style={styles.content}>
        <AppText
          variant={homeCardTypography.rowTitle.variant}
          style={homeCardTypography.rowTitle.style}
          numberOfLines={homeCardTypography.rowTitle.numberOfLines}
        >
          {venue}
        </AppText>
        <AppText
          variant={homeCardTypography.rowSubtitle.variant}
          muted
          numberOfLines={homeCardTypography.rowSubtitle.numberOfLines}
        >
          {date}
        </AppText>
      </View>
      <Badge variant={roleBadge} />
    </Card>
  );
}

const createStyles = (_theme: Theme) =>
  StyleSheet.create({
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
  });
