import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Badge, type BadgeVariant } from '@/features/home/components/Badge';
import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';
import { ProgressBar } from '@/features/home/components/ProgressBar';
import { colors, radii, spacing } from '@/theme';

type Props = {
  title: string;
  venue: string;
  date: string;
  statusBadge: BadgeVariant;
  progress: number;
  imageUri?: string;
  onPress?: () => void;
};

export function EventListItem({
  title,
  venue,
  date,
  statusBadge,
  progress,
  imageUri,
  onPress,
}: Props) {
  return (
    <Card style={styles.card} onPress={onPress ?? (() => {})}>
      <PlaceholderImage uri={imageUri} style={styles.image} />
      <View style={styles.content}>
        <View style={styles.header}>
          <AppText variant="body" style={styles.title} numberOfLines={1}>
            {title}
          </AppText>
          <Badge variant={statusBadge} />
        </View>
        <AppText variant="caption" muted>{`${venue} · ${date}`}</AppText>
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <ProgressBar progress={progress} />
          </View>
          <AppText variant="caption" style={styles.percentage}>
            {`${Math.round(progress * 100)}%`}
          </AppText>
        </View>
      </View>
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
    width: 64,
    height: 64,
    borderTopLeftRadius: radii.md,
    borderBottomLeftRadius: radii.md,
  },
  content: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingRight: spacing.md,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    fontWeight: '600',
    flex: 1,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
  },
  percentage: {
    color: colors.foregroundMuted,
    minWidth: 36,
    textAlign: 'right',
  },
});
