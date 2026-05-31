import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';
import { colors, radii, spacing } from '@/theme';

type Props = {
  name: string;
  rating: number;
  tagline: string;
  avatarUri?: string;
  onEnquire?: () => void;
};

export function ActCard({ name, rating, tagline, avatarUri, onEnquire }: Props) {
  const { t } = useTranslation();
  return (
    <Card style={styles.card}>
      <View style={styles.avatarContainer}>
        <PlaceholderImage uri={avatarUri} style={styles.avatar} />
      </View>
      <View style={styles.content}>
        <AppText variant="body" style={styles.name}>
          {name}
        </AppText>
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={12} color={colors.primary} />
          <AppText variant="caption" style={styles.rating}>
            {rating.toFixed(1)}
          </AppText>
        </View>
        <AppText variant="caption" muted numberOfLines={1}>
          {tagline}
        </AppText>
      </View>
      <Button variant="secondary" size="sm" onPress={onEnquire ?? (() => {})}>
        {t('home.venue.enquire')}
      </Button>
    </Card>
  );
}

const AVATAR_SIZE = 48;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginHorizontal: spacing.lg,
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radii.pill,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  rating: {
    color: colors.foregroundMuted,
  },
});
