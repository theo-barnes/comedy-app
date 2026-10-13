import { useCallback, useEffect, useRef, useState } from 'react';
import { useEvent } from 'expo';
import { useVideoPlayer } from 'expo-video';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { getApiErrorMessage, isApiConfigured } from '@/lib/api/client';
import {
  fetchNarrationAudio,
  type NarrationAudioFile,
  type NarrationResourceType,
} from '@/lib/api/narration';

type Props = {
  resourceType: NarrationResourceType;
  resourceId: string;
  label: string;
};

export function NarrationButton({ resourceType, resourceId, label }: Props) {
  const { t } = useTranslation();
  const player = useVideoPlayer(null);
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioFile = useRef<NarrationAudioFile | null>(null);
  const request = useRef<AbortController | null>(null);

  const clearAudio = useCallback(async () => {
    player.pause();
    await player.replaceAsync(null);
    audioFile.current?.dispose();
    audioFile.current = null;
  }, [player]);

  useEffect(() => {
    return () => {
      request.current?.abort();
      void clearAudio();
    };
  }, [clearAudio]);

  if (!isApiConfigured()) {
    return null;
  }

  const play = async () => {
    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      await clearAudio();
      const nextAudio = await fetchNarrationAudio(resourceType, resourceId, controller.signal);
      audioFile.current = nextAudio;
      await player.replaceAsync(nextAudio.file.uri);
      player.play();
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(getApiErrorMessage(reason instanceof Error ? reason : new Error(), t));
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setIsLoading(false);
      }
    }
  };

  const stop = () => {
    void clearAudio();
  };

  return (
    <>
      <Button
        accessibilityLabel={
          isPlaying
            ? t('accessibility.stopNarration', { label })
            : t('accessibility.listenTo', { label })
        }
        accessibilityHint={t('accessibility.narrationHint')}
        variant="secondary"
        size="sm"
        loading={isLoading}
        onPress={() => void (isPlaying ? stop() : play())}
      >
        {isPlaying ? t('accessibility.stopNarration') : t('accessibility.listen')}
      </Button>
      {error ? <ErrorBanner message={error} /> : null}
    </>
  );
}
