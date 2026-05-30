import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { colors, spacing } from '@/theme';

type Props = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function BackButton({ onPress, style }: Props) {
  return (
    <Pressable style={[styles.button, style]} onPress={onPress ?? (() => router.back())}>
      <Ionicons name="arrow-back" size={22} color={colors.foreground} />
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
