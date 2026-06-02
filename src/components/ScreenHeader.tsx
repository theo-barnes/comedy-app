import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';
import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';

const AVATAR_SIZE = 40;

export type ScreenHeaderProps = {
  city: string;
  tabLabel: string;
  avatarUri?: string;
};

export function ScreenHeader({ city, tabLabel, avatarUri }: ScreenHeaderProps) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const handleAvatarPress = useCallback(() => {
    router.replace('/(tabs)/profile');
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <AppText variant="caption" style={styles.city}>
          {city}
        </AppText>
        <AppText variant="caption" muted>
          {'  ·  '}
        </AppText>
        <AppText variant="caption" style={styles.tabLabel}>
          {tabLabel}
        </AppText>
      </View>
      <View style={styles.right}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          hitSlop={8}
          onPress={handleAvatarPress}
          style={styles.avatarContainer}
        >
          <PlaceholderImage uri={avatarUri} style={styles.avatarFill} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    city: {
      color: theme.colors.primaryRest,
      fontWeight: '600',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    tabLabel: {
      color: theme.colors.textMuted,
      letterSpacing: 0.5,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
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
