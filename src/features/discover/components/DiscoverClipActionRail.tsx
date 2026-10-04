import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type DiscoverClipActionRailProps = {
  liked: boolean;
  likePending: boolean;
  onToggleLike: () => void;
  style?: StyleProp<ViewStyle>;
};

export function DiscoverClipActionRail({
  liked,
  likePending,
  onToggleLike,
  style,
}: DiscoverClipActionRailProps) {
  return (
    <View style={[styles.container, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={liked ? 'Unlike clip' : 'Like clip'}
        accessibilityState={{ selected: liked, disabled: likePending }}
        disabled={likePending}
        hitSlop={8}
        style={styles.action}
        onPress={onToggleLike}
      >
        <Ionicons name={liked ? 'heart' : 'heart-outline'} size={30} color="#FFFFFF" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Tickets coming soon"
        accessibilityState={{ disabled: true }}
        disabled
        hitSlop={8}
        style={styles.action}
      >
        <Ionicons name="ticket-outline" size={28} color="rgba(255,255,255,0.56)" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Interested coming soon"
        accessibilityState={{ disabled: true }}
        disabled
        hitSlop={8}
        style={styles.action}
      >
        <Ionicons name="bookmark-outline" size={28} color="rgba(255,255,255,0.56)" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 20,
  },
  action: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
