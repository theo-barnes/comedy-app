import { useEvent } from 'expo';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView, type ContentType, type VideoSource } from 'expo-video';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';

type FeedVideoPlayerProps = {
  uri: string;
  thumbnailUri?: string;
  isActive: boolean;
  muted: boolean;
  onPlaybackError?: () => void;
  contentType?: ContentType;
};

function videoSource(uri: string, contentType: ContentType): VideoSource {
  return { uri, contentType };
}

export function FeedVideoPlayer({
  uri,
  thumbnailUri,
  isActive,
  muted,
  onPlaybackError,
  contentType = 'hls',
}: FeedVideoPlayerProps) {
  const [renderedUri, setRenderedUri] = useState<string | null>(null);
  const firstFrameRendered = renderedUri === uri;
  const player = useVideoPlayer(videoSource(uri, contentType), (instance) => {
    instance.loop = true;
    instance.staysActiveInBackground = false;
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  useEffect(() => {
    // expo-video exposes mutable player controls as its imperative API.
    // eslint-disable-next-line react-hooks/immutability
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (isActive) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, player]);

  useEffect(() => {
    if (status === 'error') onPlaybackError?.();
  }, [onPlaybackError, status]);

  async function retry() {
    setRenderedUri(null);
    await player.replaceAsync(videoSource(uri, contentType));
    if (isActive) player.play();
  }

  return (
    <View style={styles.container}>
      <VideoView
        testID="feed-video-view"
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        onFirstFrameRender={() => setRenderedUri(uri)}
      />

      {!firstFrameRendered && thumbnailUri ? (
        <Image
          testID="feed-video-thumbnail"
          source={{ uri: thumbnailUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}

      {status === 'loading' ? (
        <View style={styles.centered} pointerEvents="none">
          <ActivityIndicator testID="feed-video-buffering" color="#FFFFFF" />
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={styles.centered}>
          <AppText variant="body" style={styles.errorText}>
            Video unavailable
          </AppText>
          <Button accessibilityRole="button" size="sm" variant="secondary" onPress={retry}>
            Retry
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  centered: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  errorText: {
    color: '#FFFFFF',
  },
});
