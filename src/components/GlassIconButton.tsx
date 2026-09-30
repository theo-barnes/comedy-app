import { Pressable, StyleSheet, type AccessibilityState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { GlassSurface, useLiquidGlassSupport } from '@/components/GlassSurface';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/providers/ThemeProvider';
import { radii } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityState?: AccessibilityState;
  /** Diameter of the button. Defaults to `theme.searchBar.height`. */
  size?: number;
  testID?: string;
};

/** Round Liquid Glass icon button with the shared solid fallback. */
export function GlassIconButton({
  iconName,
  onPress,
  accessibilityLabel,
  accessibilityState,
  size,
  testID,
}: Props) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const glassEnabled = useLiquidGlassSupport();
  const diameter = size ?? theme.searchBar.height;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
    >
      <GlassSurface
        testID={testID}
        style={[
          styles.surface,
          { width: diameter, height: diameter },
          !glassEnabled && styles.fallback,
        ]}
      >
        <Ionicons name={iconName} size={theme.searchBar.iconSize} color={theme.colors.textMuted} />
      </GlassSurface>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    surface: {
      borderRadius: radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallback: {
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  });
