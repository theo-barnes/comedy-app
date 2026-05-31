import { StyleSheet, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/theme';
import type { UserRole } from '@/types';
import { PlaceholderImage } from './PlaceholderImage';

const ROLE_LABEL: Record<UserRole, string> = {
  fan: 'FAN',
  comedian: 'COMEDIAN',
  venue: 'PROMOTER',
};

const AVATAR_SIZE = 40;

type Props = {
  city: string;
  role: UserRole;
  notificationCount?: number;
  avatarUri?: string;
};

export function HomeHeader({ city, role, notificationCount = 0, avatarUri }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <AppText variant="caption" style={styles.city}>
          {city}
        </AppText>
        <AppText variant="caption" muted>
          {'  ·  '}
        </AppText>
        <AppText variant="caption" style={styles.roleLabel}>
          {ROLE_LABEL[role]}
        </AppText>
      </View>
      <View style={styles.right}>
        <View style={styles.bellContainer}>
          <Ionicons name="notifications-outline" size={24} color={colors.foreground} />
          {notificationCount > 0 && (
            <View style={styles.badgeDot}>
              <AppText style={styles.badgeText}>{String(notificationCount)}</AppText>
            </View>
          )}
        </View>
        <View style={styles.avatarContainer}>
          <PlaceholderImage uri={avatarUri} style={styles.avatarFill} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  city: {
    color: colors.primary,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  roleLabel: {
    color: colors.foregroundMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  bellContainer: {
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background,
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  avatarFill: {
    width: '100%',
    height: '100%',
  },
});
