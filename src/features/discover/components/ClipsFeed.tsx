import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from 'react-native';

import { AppText } from '@/components/AppText';

import type { ClipFeedItem } from '../types';

type Props = {
  items: ClipFeedItem[];
};

const SCREEN_WIDTH = Dimensions.get('window').width;

export function ClipsFeed({ items }: Props) {
  const [itemHeight, setItemHeight] = useState(0);

  function handleLayout(e: LayoutChangeEvent) {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && h !== itemHeight) setItemHeight(h);
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {itemHeight > 0 && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: itemHeight,
            offset: itemHeight * index,
            index,
          })}
          renderItem={({ item }) => <ClipCard item={item} height={itemHeight} />}
        />
      )}
    </View>
  );
}

// ─── ClipCard ──────────────────────────────────────────────────────────────

type ClipCardProps = {
  item: ClipFeedItem;
  height: number;
};

function ClipCard({ item, height }: ClipCardProps) {
  return (
    <View style={[styles.card, { height }]}>
      {item.imageUri ? (
        <Image source={{ uri: item.imageUri }} style={styles.bg} resizeMode="cover" />
      ) : (
        <View style={styles.bgFallback} />
      )}

      {/* Right-side action rail */}
      <View style={styles.actionRail}>
        <ActionButton icon="heart-outline" label={item.likeCount ?? '·'} />
        <ActionButton icon="chatbubble-outline" label={item.commentCount ?? '·'} />
        <ActionButton icon="paper-plane-outline" label="Share" />
        <ActionButton icon="bookmark-outline" label="Save" />
      </View>

      {/* Bottom info strip */}
      <View style={styles.bottomInfo}>
        <AppText style={styles.venueLabel}>{item.venueLine}</AppText>
        <AppText style={styles.clipTitle} numberOfLines={2}>
          {item.title}
        </AppText>
        <View style={styles.statRow}>
          <Ionicons name="eye-outline" size={14} color="rgba(255,255,255,0.55)" />
          <AppText style={styles.statText}>{item.viewerStat}</AppText>
        </View>
      </View>
    </View>
  );
}

// ─── ActionButton ──────────────────────────────────────────────────────────

type ActionButtonProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
};

function ActionButton({ icon, label }: ActionButtonProps) {
  return (
    <Pressable style={styles.actionButton}>
      <Ionicons name={icon} size={28} color="#FFFFFF" />
      <AppText style={styles.actionLabel}>{label}</AppText>
    </Pressable>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  card: {
    width: SCREEN_WIDTH,
    backgroundColor: '#0D0D14',
    overflow: 'hidden',
  },
  bg: {
    ...StyleSheet.absoluteFill,
  },
  bgFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0D0D14',
  },
  actionRail: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    alignItems: 'center',
    gap: 22,
  },
  actionButton: {
    alignItems: 'center',
    gap: 5,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomInfo: {
    position: 'absolute',
    left: 18,
    right: 82,
    bottom: 28,
    gap: 6,
  },
  venueLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  clipTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '600',
  },
});
