import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing, typography } from '@/theme/tokens';
import type { Theme } from '@/theme/types';
import { PlaceholderImage } from '@/features/home/components/PlaceholderImage';

const AVATAR_SIZE = 40;

export type ScreenHeaderProps = {
  city: string;
  onCityPress?: () => void;
  tabLabel: string;
  avatarUri?: string;
  onAvatarPress?: () => void;
  inlineTabs?: readonly {
    id: string;
    label: string;
    accessibilityLabel?: string;
  }[];
  activeInlineTabId?: string;
  onInlineTabPress?: (tabId: string) => void;
};

export function ScreenHeader({
  city,
  onCityPress,
  tabLabel,
  avatarUri,
  onAvatarPress,
  inlineTabs,
  activeInlineTabId,
  onInlineTabPress,
}: ScreenHeaderProps) {
  const router = useRouter();
  const styles = useThemedStyles(createStyles);
  const handleAvatarPress = useCallback(() => {
    if (onAvatarPress) {
      onAvatarPress();
      return;
    }

    router.replace('/(tabs)/profile');
  }, [onAvatarPress, router]);

  const hasInlineTabs = Boolean(inlineTabs?.length);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {onCityPress ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={city}
            hitSlop={8}
            onPress={onCityPress}
            style={styles.cityPressable}
          >
            <AppText numberOfLines={1} ellipsizeMode="tail" variant="caption" style={styles.city}>
              {city}
            </AppText>
          </Pressable>
        ) : (
          <AppText numberOfLines={1} ellipsizeMode="tail" variant="caption" style={styles.city}>
            {city}
          </AppText>
        )}
        <AppText variant="caption" muted style={styles.separator}>
          {'·'}
        </AppText>
        <AppText numberOfLines={1} ellipsizeMode="tail" variant="caption" style={styles.tabLabel}>
          {tabLabel}
        </AppText>
      </View>

      {hasInlineTabs ? (
        <View style={styles.middle}>
          <View style={styles.inlineTabs}>
            {inlineTabs?.map((tab) => {
              const selected = tab.id === activeInlineTabId;
              return (
                <Pressable
                  key={tab.id}
                  accessibilityRole="button"
                  accessibilityLabel={tab.accessibilityLabel ?? tab.label}
                  accessibilityState={{ selected }}
                  hitSlop={8}
                  onPress={() => onInlineTabPress?.(tab.id)}
                  style={styles.inlineTabButton}
                >
                  <AppText
                    variant="caption"
                    style={[styles.inlineTabLabel, selected && styles.inlineTabLabelActive]}
                  >
                    {tab.label}
                  </AppText>
                  <View
                    style={[styles.inlineTabUnderline, selected && styles.inlineTabUnderlineActive]}
                  />
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

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
      paddingHorizontal: spacing.md,
      paddingTop: spacing.xs,
      paddingBottom: spacing.xs,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      minWidth: 0,
    },
    city: {
      color: theme.colors.primaryRest,
      fontWeight: '600',
      letterSpacing: 0.5,
      fontSize: typography.label,
      textTransform: 'uppercase',
      flexShrink: 1,
      maxWidth: 90,
    },
    cityPressable: {
      flexShrink: 1,
      minWidth: 0,
    },
    separator: {
      marginHorizontal: spacing.sm,
    },
    tabLabel: {
      color: theme.colors.textMuted,
      letterSpacing: 0.5,
      flexShrink: 0,
    },
    middle: {
      flex: 1,
      minWidth: 0,
      alignItems: 'flex-start',
      justifyContent: 'center',
      marginLeft: spacing.xs + 2,
      marginRight: spacing.sm,
    },
    inlineTabs: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: spacing.sm,
    },
    inlineTabButton: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 48,
      paddingHorizontal: spacing.xs,
      paddingVertical: 0,
      paddingBottom: 1,
    },
    inlineTabLabel: {
      color: theme.colors.primaryRest,
      fontWeight: '600',
      letterSpacing: 0.5,
      fontSize: typography.label,
      textTransform: 'uppercase',
      transform: [{ translateY: 1 }],
    },
    inlineTabLabelActive: {
      color: theme.colors.primaryPressed,
      transform: [{ translateY: 0 }],
    },
    inlineTabUnderline: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      height: 1,
      backgroundColor: 'transparent',
    },
    inlineTabUnderlineActive: {
      backgroundColor: theme.colors.primaryRest,
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
