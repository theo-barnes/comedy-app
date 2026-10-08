import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { spacing } from '@/theme/tokens';

import { GigPosterImage } from './GigPosterImage';
import { pickPoster, type PosterLimits } from './poster-picker';
import type { PosterSelection } from './poster-upload';

const pickerErrorKeys = [
  'events.poster.unsupported',
  'events.poster.animated',
  'events.poster.tooLarge',
  'events.poster.tooManyPixels',
  'events.poster.unreadable',
] as const;

export function PosterPreview({ uri, label }: { uri: string; label: string }) {
  return <GigPosterImage uri={uri} label={label} style={styles.preview} />;
}

export function PosterPicker({
  selection,
  onChange,
  limits,
  disabled = false,
}: {
  selection: PosterSelection | null;
  onChange: (selection: PosterSelection | null) => void;
  limits: PosterLimits;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const busy = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function choose() {
    if (busy.current || disabled) return;
    busy.current = true;
    setPicking(true);
    setError(null);
    try {
      const picked = await pickPoster(limits);
      if (alive.current && picked) onChange(picked);
    } catch (failure) {
      if (alive.current) {
        const key =
          pickerErrorKeys.find((key) => failure instanceof Error && failure.message === key) ??
          'events.poster.pickerFailed';
        setError(t(key));
      }
    } finally {
      busy.current = false;
      if (alive.current) setPicking(false);
    }
  }

  return (
    <View style={styles.section}>
      <AppText variant="subheading">{t('events.poster.optional')}</AppText>
      <AppText variant="caption" muted>
        {t('events.poster.limits')}
      </AppText>
      {selection && (
        <PosterPreview uri={selection.uri} label={t('events.poster.selectedPreview')} />
      )}
      <ErrorBanner message={error} />
      <Button variant="secondary" disabled={disabled} loading={picking} onPress={choose}>
        {t(selection ? 'events.poster.reselect' : 'events.poster.choose')}
      </Button>
      {selection && (
        <Button variant="ghost" disabled={disabled || picking} onPress={() => onChange(null)}>
          {t('events.poster.clearSelection')}
        </Button>
      )}
    </View>
  );
}

export function PosterProgress({
  status,
  progress,
  onCancel,
}: {
  status: 'idle' | 'uploading' | 'processing' | 'attaching';
  progress: number;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.section} accessibilityLiveRegion="polite">
      <AppText>{t(`events.poster.${status}`, { percent: Math.round(progress * 100) })}</AppText>
      {status === 'uploading' && (
        <Button variant="ghost" onPress={onCancel}>
          {t('common.cancel')}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  preview: { width: '100%', height: 320 },
});
