import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, View, type ViewProps } from 'react-native';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
  type GlassStyle,
} from 'expo-glass-effect';

import { useTheme } from '@/providers/ThemeProvider';

type GlassSurfaceProps = ViewProps & {
  /** Glass style when available. Defaults to 'regular'. */
  glassEffectStyle?: GlassStyle;
  /** Tint applied to the glass material. */
  tintColor?: string;
  /** Enables the interactive (touch-responsive) glass variant. */
  isInteractive?: boolean;
};

/**
 * Tracks the user's Reduce Transparency accessibility setting (iOS).
 * Liquid Glass should degrade to a solid surface when it is enabled.
 */
function useReduceTransparency(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let cancelled = false;
    AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (!cancelled) setEnabled(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setEnabled,
    );
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);

  return enabled;
}

// Module-level: availability cannot change during an app session.
// isGlassEffectAPIAvailable guards iOS 26 betas missing the API (expo/expo#40911).
const glassAvailable =
  Platform.OS === 'ios' && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

/**
 * The app's single entry point for Apple Liquid Glass.
 *
 * Renders a native `GlassView` on iOS 26+ and degrades to a themed solid
 * `View` everywhere else (older iOS, Android, web) or when the user has
 * Reduce Transparency enabled. Consumers should never import
 * `expo-glass-effect` directly — use this component so fallback behaviour
 * stays consistent.
 */
export function GlassSurface({
  glassEffectStyle = 'regular',
  tintColor,
  isInteractive,
  style,
  children,
  ...viewProps
}: GlassSurfaceProps) {
  const { theme } = useTheme();
  const reduceTransparency = useReduceTransparency();

  if (!glassAvailable || reduceTransparency) {
    return (
      <View {...viewProps} style={[{ backgroundColor: theme.colors.surface }, style]}>
        {children}
      </View>
    );
  }

  return (
    <GlassView
      {...viewProps}
      style={style}
      glassEffectStyle={glassEffectStyle}
      tintColor={tintColor}
      isInteractive={isInteractive}
    >
      {children}
    </GlassView>
  );
}
