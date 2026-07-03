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
 * Static device capability: the native Liquid Glass API exists (iOS 26+).
 *
 * Unlike `useLiquidGlassSupport`, this does NOT account for the Reduce
 * Transparency setting — use it for one-time structural decisions that must
 * not flip mid-session (e.g. which tab navigator to mount). UIKit reduces
 * native materials automatically when Reduce Transparency is enabled.
 */
export const isLiquidGlassCapable = glassAvailable;

/**
 * Whether Liquid Glass should render right now: the native API is available
 * (iOS 26+) and the user has not enabled Reduce Transparency.
 *
 * Use this to make layout decisions that depend on glass (e.g. floating a
 * tab bar over content). Rendering decisions should keep going through
 * `GlassSurface`, which applies the same check internally.
 */
export function useLiquidGlassSupport(): boolean {
  const reduceTransparency = useReduceTransparency();
  return glassAvailable && !reduceTransparency;
}

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
  const glassEnabled = useLiquidGlassSupport();

  if (!glassEnabled) {
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
