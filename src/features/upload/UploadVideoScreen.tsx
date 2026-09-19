import { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { FormField } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { FeedVideoPlayer } from '@/features/discover/components/FeedVideoPlayer';
import { useAuth } from '@/features/auth/useAuth';
import {
  useCompleteVideoUpload,
  useContentStatus,
  useCreateVideo,
  deleteVideoContent,
} from '@/lib/api/video-content';

import { createTusVideoUpload, type VideoUploadController } from './tus-upload';

const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

type SelectedVideo = {
  uri: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  durationMs: number | null;
  width: number;
  height: number;
};

export function UploadVideoScreen() {
  const { profile } = useAuth();
  const canUpload = profile?.role === 'comedian' || profile?.role === 'venue';
  const [selected, setSelected] = useState<SelectedVideo | null>(null);
  const [caption, setCaption] = useState('');
  const [progress, setProgress] = useState(0);
  const [controller, setController] = useState<VideoUploadController | null>(null);
  const [paused, setPaused] = useState(false);
  const [contentId, setContentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createMutation = useCreateVideo();
  const completeMutation = useCompleteVideoUpload();
  const statusQuery = useContentStatus(contentId);

  const selectAsset = useCallback((asset: ImagePicker.ImagePickerAsset) => {
    const file = new File(asset.uri);
    const sizeBytes = asset.fileSize ?? file.size;
    const mimeType = asset.mimeType || file.type || 'video/mp4';
    if (asset.type !== 'video') {
      setError('Select a video file.');
      return;
    }
    if (sizeBytes <= 0 || sizeBytes > MAX_VIDEO_SIZE_BYTES) {
      setError('Videos must be smaller than 500 MB.');
      return;
    }
    setError(null);
    setSelected({
      uri: asset.uri,
      name: asset.fileName || file.name || 'video',
      sizeBytes,
      mimeType,
      durationMs: asset.duration ?? null,
      width: asset.width,
      height: asset.height,
    });
  }, []);

  useEffect(() => {
    const recoverPendingSelection = async () => {
      const result = await ImagePicker.getPendingResultAsync();
      if (result && !('code' in result) && !result.canceled && result.assets[0]) {
        selectAsset(result.assets[0]);
      }
    };
    void recoverPendingSelection();
  }, [selectAsset]);

  async function pickVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library access is required to select a video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
    });
    if (!result.canceled && result.assets[0]) selectAsset(result.assets[0]);
  }

  async function uploadVideo() {
    if (!selected) return;
    setError(null);
    setProgress(0);
    try {
      const created = await createMutation.mutateAsync({
        caption,
        file: {
          name: selected.name,
          sizeBytes: selected.sizeBytes,
          mimeType: selected.mimeType,
          durationMs: selected.durationMs,
          width: selected.width,
          height: selected.height,
        },
      });
      if (!created.upload) throw new Error('Upload could not be initialized.');
      setContentId(created.content.id);
      const nextController = createTusVideoUpload({
        uri: selected.uri,
        sizeBytes: selected.sizeBytes,
        mimeType: selected.mimeType,
        uploadUrl: created.upload.url,
        headers: created.upload.headers,
        onProgress: setProgress,
      });
      setController(nextController);
      nextController.start();
      await nextController.completed;
      await completeMutation.mutateAsync({
        contentId: created.content.id,
        mediaAssetId: created.upload.mediaAssetId,
        bytesUploaded: selected.sizeBytes,
      });
      setController(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed.');
    }
  }

  if (!canUpload) {
    return (
      <Screen>
        <View style={styles.centered}>
          <AppText variant="heading">Creator access required</AppText>
          <AppText muted>Video uploads are currently available to comedians and venues.</AppText>
        </View>
      </Screen>
    );
  }

  const processing = contentId != null && statusQuery.data?.status === 'processing' && !controller;
  const published = statusQuery.data?.status === 'published';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="title">Create a clip</AppText>
        {error ? <ErrorBanner message={error} /> : null}

        {selected ? (
          <View style={styles.preview}>
            <FeedVideoPlayer
              uri={selected.uri}
              contentType="auto"
              isActive={!controller && !processing && !published}
              muted={false}
            />
          </View>
        ) : (
          <Button accessibilityRole="button" variant="secondary" onPress={pickVideo}>
            Select video
          </Button>
        )}

        {selected && !controller && !processing && !published ? (
          <>
            <Button accessibilityRole="button" variant="ghost" onPress={pickVideo}>
              Choose another video
            </Button>
            <FormField
              label="Caption"
              value={caption}
              onChangeText={setCaption}
              placeholder="Tell people about this clip"
              multiline
              maxLength={2000}
              style={styles.captionInput}
            />
            <Button
              accessibilityRole="button"
              loading={createMutation.isPending || completeMutation.isPending}
              onPress={uploadVideo}
            >
              Upload video
            </Button>
          </>
        ) : null}

        {controller ? (
          <View style={styles.status}>
            <AppText variant="heading">Uploading {Math.round(progress * 100)}%</AppText>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <View style={styles.actions}>
              <Button
                accessibilityRole="button"
                variant="secondary"
                onPress={() => {
                  if (paused) controller.resume();
                  else void controller.pause();
                  setPaused((value) => !value);
                }}
              >
                {paused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                accessibilityRole="button"
                variant="ghost"
                onPress={async () => {
                  await controller.cancel();
                  if (contentId) await deleteVideoContent(contentId);
                  setController(null);
                  setContentId(null);
                  setProgress(0);
                }}
              >
                Cancel
              </Button>
            </View>
          </View>
        ) : null}

        {processing ? (
          <View style={styles.status}>
            <ActivityIndicator />
            <AppText variant="heading">Processing video</AppText>
            <AppText muted>Your clip will publish automatically when it is ready.</AppText>
          </View>
        ) : null}

        {published ? (
          <View style={styles.status}>
            <AppText variant="heading">Your clip is live</AppText>
            <Button accessibilityRole="button" onPress={() => router.replace('/(tabs)/search')}>
              View Discover
            </Button>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: 20, padding: 20, paddingBottom: 120 },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  preview: { height: 420, overflow: 'hidden', borderRadius: 8, backgroundColor: '#000000' },
  captionInput: { minHeight: 100, textAlignVertical: 'top' },
  status: { alignItems: 'center', gap: 16, paddingVertical: 24 },
  track: {
    height: 8,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  fill: { height: '100%', backgroundColor: '#E5484D' },
  actions: { flexDirection: 'row', gap: 12 },
});
