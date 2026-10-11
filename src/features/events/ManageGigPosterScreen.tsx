import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/features/auth/useAuth';
import { ApiError, isApiConfigured } from '@/lib/api/client';
import { useEvent, usePosterConfig } from '@/lib/api/gig-posters';
import { spacing } from '@/theme/tokens';

import { PosterPicker, PosterPreview, PosterProgress } from './PosterPicker';
import { useGigPosterUpload, type PosterSelection } from './poster-upload';

export function ManageGigPosterScreen({ eventId }: { eventId: string | undefined }) {
  const { profile } = useAuth();
  return <AccountManageGigPosterScreen key={`${profile?.id}:${eventId}`} eventId={eventId} />;
}

function AccountManageGigPosterScreen({ eventId }: { eventId: string | undefined }) {
  const { t } = useTranslation();
  const { profile, isLoading, isGuest } = useAuth();
  const allowed = !isGuest && profile?.role === 'venue';
  const eventQuery = useEvent(eventId, allowed && isApiConfigured());
  const config = usePosterConfig(allowed && isApiConfigured());
  const upload = useGigPosterUpload(profile?.id ?? 'anonymous');
  const [selection, setSelection] = useState<PosterSelection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const [working, setWorking] = useState(false);
  const busyRef = useRef(false);
  const alive = useRef(true);
  const busy = working || upload.isPending;
  const event = eventQuery.data;
  const owned = event?.venueId === profile?.id;

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function refresh() {
    const result = await eventQuery.refetch();
    if (alive.current && !result.isError) setRefreshRequired(false);
  }

  async function changePoster() {
    if (
      !event ||
      !owned ||
      !config.data ||
      config.isError ||
      event.publicationStatus !== 'published' ||
      busyRef.current ||
      refreshRequired ||
      !selection
    )
      return;
    busyRef.current = true;
    setWorking(true);
    setError(null);
    try {
      await upload.upload(event, selection);
      if (alive.current) {
        setSelection(null);
      }
    } catch (failure) {
      if (alive.current) {
        setError(failure instanceof Error ? failure.message : t('events.poster.uploadFailed'));
        if (failure instanceof ApiError && failure.status === 409) {
          setRefreshRequired(true);
          await refresh();
        }
      }
    } finally {
      busyRef.current = false;
      if (alive.current) setWorking(false);
    }
  }

  let body;
  if (isLoading) {
    body = <ActivityIndicator accessibilityLabel={t('common.loading')} />;
  } else if (!allowed) {
    body = <AppText>{t('events.create.permissionDenied')}</AppText>;
  } else if (!eventId) {
    body = <AppText>{t('events.poster.missingEvent')}</AppText>;
  } else if (!isApiConfigured()) {
    body = <AppText>{t('events.create.unconfigured')}</AppText>;
  } else if (eventQuery.isPending) {
    body = <ActivityIndicator accessibilityLabel={t('common.loading')} />;
  } else if (!event) {
    body = (
      <>
        <ErrorBanner message={eventQuery.error?.message ?? t('events.poster.missingEvent')} />
        <Button onPress={() => void refresh()}>{t('common.retry')}</Button>
      </>
    );
  } else if (!owned) {
    body = <AppText>{t('events.poster.notOwner')}</AppText>;
  } else if (event.publicationStatus === 'draft') {
    body = (
      <>
        <AppText>{t('events.poster.privatePreparation')}</AppText>
        <Button
          onPress={() =>
            router.replace({ pathname: '/create-event', params: { draftId: event.id } })
          }
        >
          {t('events.poster.completeGig')}
        </Button>
      </>
    );
  } else {
    body = (
      <View style={styles.section}>
        <AppText variant="subheading">{event.title}</AppText>
        <AppText muted>{t('events.poster.publicHelp')}</AppText>
        {event.posterUrl ? (
          <PosterPreview uri={event.posterUrl} label={t('events.poster.currentPreview')} />
        ) : (
          <AppText>{t('events.poster.noPoster')}</AppText>
        )}
        <ErrorBanner message={error} />
        {eventQuery.isError && (
          <>
            <ErrorBanner message={eventQuery.error?.message ?? t('events.poster.uploadFailed')} />
            <Button disabled={busy} onPress={() => void refresh()}>
              {t('common.retry')}
            </Button>
          </>
        )}
        {config.isError && (
          <>
            <ErrorBanner message={config.error.message} />
            <Button onPress={() => void config.refetch()}>{t('events.poster.retryConfig')}</Button>
          </>
        )}
        {config.isPending && <ActivityIndicator accessibilityLabel={t('common.loading')} />}
        {refreshRequired && (
          <Button disabled={busy} onPress={() => void refresh()}>
            {t('events.poster.refreshConflict')}
          </Button>
        )}
        {config.data && !config.isError ? (
          upload.isPending ? (
            <PosterProgress
              status={upload.status}
              progress={upload.progress}
              onCancel={() =>
                void upload
                  .cancel()
                  .catch((failure: unknown) =>
                    setError(
                      failure instanceof Error ? failure.message : t('events.poster.uploadFailed'),
                    ),
                  )
              }
            />
          ) : (
            <>
              <PosterPicker
                selection={selection}
                onChange={setSelection}
                limits={config.data}
                disabled={busy || refreshRequired}
              />
              {selection && (
                <Button disabled={busy || refreshRequired} onPress={() => void changePoster()}>
                  {t('events.poster.replace')}
                </Button>
              )}
              <AppText>{t('events.poster.replacementHelp')}</AppText>
            </>
          )
        ) : !config.isPending && !config.isError ? (
          <AppText>{t('events.poster.unavailable')}</AppText>
        ) : null}
      </View>
    );
  }
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Button variant="ghost" disabled={busy} onPress={() => router.back()}>
          {t('common.back')}
        </Button>
        <AppText variant="heading">{t('events.poster.manage')}</AppText>
        {body}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  section: { gap: spacing.md },
});
