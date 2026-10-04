import { useFocusEffect } from 'expo-router';
import { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ExpandingSearchBar } from '@/components/ExpandingSearchBar';
import { LocationContext } from '@/features/location';
import { useToggleLike } from '@/lib/api/engagement';
import { useVideoFeed } from '@/lib/api/video-feed';
import type { FeedItem } from '@/lib/api/home-feed';

import { DiscoverClipActionRail } from './DiscoverClipActionRail';
import { FeedVideoPlayer } from './FeedVideoPlayer';
import { VideoCaption } from './VideoCaption';

export function DiscoverFeed() {
  const location = useContext(LocationContext);
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, right: 0, bottom: 0, left: 0 };
  const query = useVideoFeed(location?.latitude ?? null, location?.longitude ?? null);
  const [itemHeight, setItemHeight] = useState(0);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [screenFocused, setScreenFocused] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [optimisticLikes, setOptimisticLikes] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const toggleLike = useToggleLike();
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      return () => setScreenFocused(false);
    }, []),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<FeedItem>[] }) => {
      setActiveContentId(viewableItems[0]?.item.contentId ?? null);
    },
    [],
  );

  function handleLayout(event: LayoutChangeEvent) {
    const height = event.nativeEvent.layout.height;
    if (height > 0 && height !== itemHeight) setItemHeight(height);
  }

  function handleToggleLike(item: FeedItem) {
    const liked = optimisticLikes[item.contentId] ?? item.viewerLiked;
    setOptimisticLikes((current) => ({ ...current, [item.contentId]: !liked }));
    toggleLike.mutate(
      { contentId: item.contentId, liked },
      {
        onError: () => setOptimisticLikes((current) => ({ ...current, [item.contentId]: liked })),
      },
    );
  }

  if (query.isPending) {
    return (
      <View style={styles.centered} testID="discover-feed-loading">
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (query.isError && items.length === 0) {
    return (
      <View style={styles.centered}>
        <AppText variant="heading" style={styles.whiteText}>
          Could not load Discover
        </AppText>
        <Button accessibilityRole="button" variant="secondary" onPress={() => query.refetch()}>
          Retry
        </Button>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Ionicons name="videocam-outline" size={44} color="rgba(255,255,255,0.72)" />
        <AppText variant="heading" style={styles.whiteText}>
          No clips yet
        </AppText>
        <AppText variant="body" style={styles.mutedText}>
          Fresh comedy will appear here.
        </AppText>
      </View>
    );
  }

  return (
    <View testID="discover-feed" style={styles.container} onLayout={handleLayout}>
      {itemHeight > 0 ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.contentId}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          initialNumToRender={2}
          maxToRenderPerBatch={3}
          windowSize={3}
          removeClippedSubviews
          getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
          viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
          onViewableItemsChanged={onViewableItemsChanged}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
          }}
          onRefresh={() => void query.refetch()}
          refreshing={query.isRefetching && !query.isFetchingNextPage}
          renderItem={({ item }) => {
            const liked = optimisticLikes[item.contentId] ?? item.viewerLiked;
            const likePending =
              toggleLike.isPending && toggleLike.variables?.contentId === item.contentId;

            return (
              <View style={[styles.item, { height: itemHeight }]}>
                {item.hlsUrl ? (
                  <FeedVideoPlayer
                    uri={item.hlsUrl}
                    thumbnailUri={item.thumbnailUrl ?? undefined}
                    isActive={activeContentId === item.contentId && screenFocused && appActive}
                  />
                ) : (
                  <View style={styles.centered}>
                    <AppText style={styles.whiteText}>Video unavailable</AppText>
                  </View>
                )}
                <View
                  style={[styles.overlay, { bottom: insets.bottom + 68 }]}
                  pointerEvents="box-none"
                >
                  <VideoCaption creatorName={item.creatorName} description={item.description} />
                </View>
                <DiscoverClipActionRail
                  liked={liked}
                  likePending={likePending}
                  onToggleLike={() => handleToggleLike(item)}
                  style={[styles.actionRail, { bottom: insets.bottom + 76 }]}
                />
              </View>
            );
          }}
        />
      ) : null}
      <ExpandingSearchBar
        testID="discover-search"
        style={[styles.search, { top: insets.top + 12 }]}
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onSubmit={setSearchQuery}
      >
        <View />
      </ExpandingSearchBar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  item: { width: '100%', backgroundColor: '#000000' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    backgroundColor: '#000000',
  },
  overlay: {
    position: 'absolute',
    left: 18,
    right: 88,
  },
  actionRail: {
    position: 'absolute',
    right: 16,
  },
  search: {
    position: 'absolute',
    right: 18,
    width: '75%',
    zIndex: 1,
    elevation: 1,
  },
  whiteText: { color: '#FFFFFF', textAlign: 'center' },
  mutedText: { color: 'rgba(255,255,255,0.7)', textAlign: 'center' },
});
