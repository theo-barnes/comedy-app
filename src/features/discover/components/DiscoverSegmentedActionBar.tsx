import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing, typography } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

import type { DiscoverMode, DiscoverView } from '../types';

type Props = {
  modes: readonly DiscoverMode[];
  activeView: DiscoverView;
  onViewChange: (view: DiscoverView) => void;
  onSearchPress: (activeView: DiscoverView) => void;
  onFilterPress: (activeView: DiscoverView) => void;
  filterEnabled?: boolean;
};

export function DiscoverSegmentedActionBar({
  modes,
  activeView,
  onViewChange,
  onSearchPress,
  onFilterPress,
  filterEnabled = true,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const isClipsView = activeView === 'clips';
  const springConfig = {
    stiffness: 220,
    damping: 22,
    mass: 0.9,
    overshootClamping: false,
    restDisplacementThreshold: 0.1,
    restSpeedThreshold: 0.1,
  } as const;
  const [railWidth, setRailWidth] = useState(0);
  const hasMeasuredRail = useRef(false);

  const activeIndex = Math.max(
    0,
    modes.findIndex((mode) => mode.id === activeView),
  );

  const translateX = useSharedValue(0);
  const segmentWidth = railWidth > 0 ? railWidth / Math.max(modes.length, 1) : 0;
  const targetX = activeIndex * segmentWidth;
  const activePillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  useEffect(() => {
    if (!hasMeasuredRail.current || segmentWidth <= 0) return;

    translateX.value = withSpring(targetX, springConfig);
  }, [segmentWidth, targetX]);

  function handleRailLayout(event: LayoutChangeEvent) {
    const nextRailWidth = event.nativeEvent.layout.width;
    if (nextRailWidth === railWidth) return;

    setRailWidth(nextRailWidth);

    if (!hasMeasuredRail.current) {
      hasMeasuredRail.current = true;
      const nextSegmentWidth = nextRailWidth / Math.max(modes.length, 1);
      translateX.value = activeIndex * nextSegmentWidth;
    }
  }

  return (
    <View style={[styles.container, isClipsView && styles.containerOnClips]}>
      <View style={styles.modeRail} onLayout={handleRailLayout}>
        {segmentWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.activePill,
              isClipsView && styles.activePillOnClips,
              {
                width: segmentWidth,
              },
              activePillStyle,
            ]}
          />
        ) : null}

        {modes.map((mode) => {
          const selected = mode.id === activeView;
          return (
            <Pressable
              key={mode.id}
              accessibilityRole="button"
              accessibilityLabel={mode.label}
              accessibilityState={{ selected }}
              hitSlop={10}
              onPress={() => onViewChange(mode.id)}
              style={({ pressed }) => [styles.modeButton, pressed && styles.modeButtonPressed]}
            >
              <AppText
                style={[
                  styles.modeLabel,
                  selected
                    ? isClipsView
                      ? styles.modeLabelActiveOnClips
                      : styles.modeLabelActive
                    : null,
                ]}
              >
                {mode.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actionRail}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open discover search"
          hitSlop={10}
          onPress={() => onSearchPress(activeView)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
        >
          <Ionicons name="search-outline" size={18} style={styles.icon} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open discover filters"
          accessibilityState={{ disabled: !filterEnabled }}
          disabled={!filterEnabled}
          hitSlop={10}
          onPress={() => onFilterPress(activeView)}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.iconButtonPressed,
            !filterEnabled && styles.iconButtonDisabled,
          ]}
        >
          <Ionicons name="options-outline" size={18} style={styles.icon} />
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      height: 56,
      borderRadius: 28,
      borderWidth: /*StyleSheet.hairlineWidth*/ 0,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.tintWash,
      paddingHorizontal: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: theme.colors.buttonShadow,
      shadowOpacity: 0.05,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    containerOnClips: {
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: theme.colors.overlayBorder,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    modeRail: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 0,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 22,
      height: 42,
    },
    activePill: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      borderRadius: 22,
      backgroundColor: theme.colors.primaryPressed,
      shadowColor: theme.colors.buttonShadow,
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 1,
    },
    activePillOnClips: {
      backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.overlayBorderActive,
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    modeButton: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
      height: '100%',
    },
    modeButtonPressed: {
      transform: [{ scale: 0.975 }],
    },
    modeLabel: {
      color: theme.colors.textMuted,
      fontWeight: '600',
      fontSize: typography.caption + 1,
      letterSpacing: 0,
    },
    modeLabelActive: {
      color: theme.colors.surface,
    },
    modeLabelActiveOnClips: {
      color: theme.colors.onOverlay,
    },
    actionRail: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: spacing.sm,
    },
    iconButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconButtonPressed: {
      backgroundColor: theme.colors.tintWash,
      transform: [{ scale: 0.96 }],
    },
    iconButtonDisabled: {
      opacity: 0.4,
    },
    icon: {
      color: theme.colors.textMuted,
    },
  });
