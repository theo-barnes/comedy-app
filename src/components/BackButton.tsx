import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { useTheme } from '@/providers/ThemeProvider';
import { spacing } from '@/theme/tokens';

/**
 * BackButton component is a simple button that displays a back arrow icon.
 * It can be used to navigate back in the navigation stack or perform a custom action when pressed.
 *
 * @param onPress - Optional callback function to be called when the button is pressed. If not provided, it will navigate back using the router.
 * @param style - Optional style to apply to the button container.
 *
 * @returns A React element representing the back button.
 */
type Props = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Exported BackButton component that renders a pressable button with a back arrow icon.
 * It uses the useTheme hook to apply the current theme's text color to the icon.
 *
 * @param param0 - The properties for the BackButton component, including onPress and style.
 * @returns A React element representing the back button.
 */
export function BackButton({ onPress, style }: Props) {
  const { theme } = useTheme();
  return (
    <Pressable style={[styles.button, style]} onPress={onPress ?? (() => router.back())}>
      <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginBottom: spacing.xl,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
