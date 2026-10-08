import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { FormField } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/features/auth/useAuth';
import { isApiConfigured } from '@/lib/api/client';
import { useMyCreatorProfile, type NativeEventInput } from '@/lib/api/events';
import { fetchEvent, usePosterConfig } from '@/lib/api/gig-posters';
import { spacing } from '@/theme/tokens';

import { nativeEventInputSchema } from './event-form';
import { InvalidPublicationJournalError, useEventPublication } from './event-publication';
import { PosterPicker, PosterProgress } from './PosterPicker';
import { useGigPosterUpload, type PosterSelection } from './poster-upload';
import { VenueSetupForm } from './VenueSetupForm';

export function CreateEventScreen() {
  const { profile } = useAuth();
  return <AccountCreateEventScreen key={profile?.id ?? 'anonymous'} />;
}

function AccountCreateEventScreen() {
  const { t } = useTranslation();
  const { profile, isLoading, isGuest } = useAuth();
  const allowed = !isGuest && profile?.role === 'venue';
  const venueQuery = useMyCreatorProfile(profile?.id, allowed);
  const publish = useEventPublication(profile?.id ?? 'anonymous', allowed && isApiConfigured());
  const posterConfig = usePosterConfig(allowed && isApiConfigured());
  const posterUpload = useGigPosterUpload(profile?.id ?? 'anonymous');
  const publishing = useRef(false);
  const alive = useRef(true);
  const [editingVenue, setEditingVenue] = useState(false);
  const [selection, setSelection] = useState<PosterSelection | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDiscardRecovery, setConfirmDiscardRecovery] = useState(false);
  const [restoredInput, setRestoredInput] = useState<NativeEventInput | null>(null);
  const [fields, setFields] = useState({
    title: '',
    date: '',
    start: '',
    endDate: '',
    end: '',
    description: '',
    ticketUrl: '',
    timeZone: 'Europe/London',
  });
  const created = publish.created;
  const busy = publish.isPending || posterUpload.isPending || reconciling;
  function publicationError(failure: Error | null) {
    return failure?.message.startsWith('events.')
      ? t(failure.message, { defaultValue: t('events.create.publishFailed') })
      : (failure?.message ?? null);
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  if (publish.pending && restoredInput !== publish.pending.input) {
    const input = publish.pending.input;
    setRestoredInput(input);
    setFields({
      title: input.title,
      date: input.localStartTime.slice(0, 10),
      start: input.localStartTime.slice(11),
      endDate: input.localEndTime?.slice(0, 10) ?? '',
      end: input.localEndTime?.slice(11) ?? '',
      timeZone: input.timeZone,
      description: input.description ?? '',
      ticketUrl: input.ticketUrl ?? '',
    });
  }

  async function refreshCreated(event = created) {
    if (!event || reconciling) return;
    setReconciling(true);
    setReconcileError(null);
    try {
      const current = await fetchEvent(event.id);
      if (current.venueId !== profile?.id) throw new Error(t('events.poster.notOwner'));
      if (alive.current) publish.setCreated(current);
    } catch (failure) {
      if (alive.current) {
        setReconcileError(
          failure instanceof Error ? failure.message : t('events.poster.refreshFailed'),
        );
      }
    } finally {
      if (alive.current) setReconciling(false);
    }
  }

  async function attachPoster(event = created) {
    if (
      !event ||
      !selection ||
      !posterConfig.data?.enabled ||
      posterUpload.isPending ||
      reconcileError
    )
      return;
    setPosterFailed(false);
    setError(null);
    try {
      const updated = await posterUpload.upload(event, selection);
      if (alive.current) {
        publish.setCreated(updated);
        setSelection(null);
      }
    } catch (failure) {
      if (alive.current) {
        setPosterFailed(true);
        setError(failure instanceof Error ? failure.message : t('events.poster.uploadFailed'));
        await refreshCreated(event);
      }
    }
  }

  async function finish() {
    if (!busy && (await publish.clear())) router.replace('/(tabs)');
  }

  async function createAnother() {
    if (busy || !(await publish.clear())) return;
    setSelection(null);
    setPosterFailed(false);
    setReconcileError(null);
    setError(null);
    setRestoredInput(null);
    setFields({
      title: '',
      date: '',
      start: '',
      endDate: '',
      end: '',
      description: '',
      ticketUrl: '',
      timeZone: 'Europe/London',
    });
  }

  async function retryPublication() {
    if (publishing.current) return;
    publishing.current = true;
    try {
      const event = await publish.submit();
      if (event && alive.current && selection) await attachPoster(event);
    } finally {
      publishing.current = false;
    }
  }

  function change(field: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [field]: value }));
  }

  async function publishEvent() {
    if (publishing.current || created) return;
    if (!!fields.endDate.trim() !== !!fields.end.trim()) {
      setError(t('events.create.validation.endPair'));
      return;
    }
    const parsed = nativeEventInputSchema.safeParse({
      title: fields.title,
      localStartTime: `${fields.date.trim()}T${fields.start.trim()}`,
      localEndTime: fields.end.trim() ? `${fields.endDate.trim()}T${fields.end.trim()}` : undefined,
      description: fields.description.trim() || undefined,
      ticketUrl: fields.ticketUrl.trim() || undefined,
      timeZone: fields.timeZone,
    });
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? 'events.create.validation.form';
      setError(t(message, { defaultValue: t('events.create.validation.form') }));
      return;
    }
    publishing.current = true;
    setError(null);
    try {
      const event = await publish.submit(parsed.data, !!selection);
      if (event && alive.current && selection) await attachPoster(event);
    } finally {
      publishing.current = false;
    }
  }

  const venue = venueQuery.data;
  const ready =
    venue?.creatorType === 'venue' &&
    !!venue.name.trim() &&
    !!venue.address?.trim() &&
    venue.latitude != null &&
    venue.longitude != null;

  let body;
  if (isLoading) {
    body = <ActivityIndicator accessibilityLabel={t('common.loading')} />;
  } else if (!allowed) {
    body = <AppText>{t('events.create.permissionDenied')}</AppText>;
  } else if (!isApiConfigured()) {
    body = <AppText>{t('events.create.unconfigured')}</AppText>;
  } else if (publish.recovering) {
    body = <ActivityIndicator accessibilityLabel={t('events.poster.recovering')} />;
  } else if (publish.recoveryError) {
    body = (
      <View style={styles.form}>
        <ErrorBanner message={publicationError(publish.recoveryError)} />
        <ErrorBanner message={publicationError(publish.error)} />
        <Button disabled={busy} onPress={publish.retryRecovery}>
          {t('common.retry')}
        </Button>
        {publish.recoveryError instanceof InvalidPublicationJournalError && (
          <>
            <AppText>{t('events.poster.invalidRecoveryHelp')}</AppText>
            <Button variant="secondary" disabled={busy} onPress={() => router.replace('/(tabs)')}>
              {t('events.poster.checkVenueHome')}
            </Button>
            {confirmDiscardRecovery ? (
              <>
                <AppText>{t('events.poster.discardRecoveryConfirmation')}</AppText>
                <Button disabled={busy} onPress={() => void publish.discardInvalidJournal()}>
                  {t('events.poster.confirmDiscardRecovery')}
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  onPress={() => setConfirmDiscardRecovery(false)}
                >
                  {t('common.cancel')}
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                disabled={busy}
                onPress={() => setConfirmDiscardRecovery(true)}
              >
                {t('events.poster.discardRecovery')}
              </Button>
            )}
          </>
        )}
      </View>
    );
  } else if (created) {
    body = (
      <View style={styles.form} accessibilityLiveRegion="polite">
        <AppText variant="heading">{t('events.create.successTitle')}</AppText>
        <AppText>{created.title}</AppText>
        <AppText>{t('events.create.successBody')}</AppText>
        {!created.posterUrl &&
          !posterUpload.isPending &&
          (posterFailed || publish.pending?.posterWanted) && (
            <AppText>{t('events.poster.partialSuccess')}</AppText>
          )}
        {publish.journalRecovered &&
          publish.pending?.posterWanted &&
          !created.posterUrl &&
          !selection && <AppText>{t('events.poster.reselectAfterRestart')}</AppText>}
        <ErrorBanner message={error ?? publicationError(publish.error)} />
        {reconciling && <ActivityIndicator accessibilityLabel={t('events.poster.refreshing')} />}
        {reconcileError && (
          <>
            <AppText>{t('events.poster.refreshFailed')}</AppText>
            <ErrorBanner message={reconcileError} />
            <Button disabled={busy} onPress={() => void refreshCreated()}>
              {t('events.poster.refreshConflict')}
            </Button>
          </>
        )}
        {posterConfig.isError && (
          <>
            <ErrorBanner message={posterConfig.error.message} />
            <Button variant="secondary" onPress={() => void posterConfig.refetch()}>
              {t('events.poster.retryConfig')}
            </Button>
          </>
        )}
        {posterUpload.isPending ? (
          <PosterProgress
            status={posterUpload.status}
            progress={posterUpload.progress}
            onCancel={() =>
              void posterUpload
                .cancel()
                .catch((failure: unknown) =>
                  setError(
                    failure instanceof Error ? failure.message : t('events.poster.uploadFailed'),
                  ),
                )
            }
          />
        ) : posterConfig.data?.enabled && !created.posterUrl ? (
          <>
            <PosterPicker
              selection={selection}
              onChange={setSelection}
              limits={posterConfig.data}
              disabled={busy}
            />
            {selection && (
              <Button onPress={() => void attachPoster()} disabled={busy || !!reconcileError}>
                {t('events.poster.retryUpload')}
              </Button>
            )}
          </>
        ) : null}
        <Button
          variant="secondary"
          disabled={busy}
          onPress={() =>
            router.push({ pathname: '/manage-gig-poster', params: { eventId: created.id } })
          }
        >
          {t('events.poster.manage')}
        </Button>
        <Button disabled={busy} onPress={() => void finish()}>
          {t('events.create.returnHome')}
        </Button>
        <Button variant="ghost" disabled={busy} onPress={() => void createAnother()}>
          {t('events.poster.createAnother')}
        </Button>
      </View>
    );
  } else if (publish.pending) {
    body = (
      <View style={styles.form} accessibilityLiveRegion="polite">
        <AppText variant="subheading">{t('events.poster.pendingTitle')}</AppText>
        <AppText>{publish.pending.input.title}</AppText>
        <AppText>{t('events.poster.pendingBody')}</AppText>
        <ErrorBanner message={publicationError(publish.error)} />
        <Button loading={busy} onPress={() => void retryPublication()}>
          {t('events.poster.retryPublication')}
        </Button>
      </View>
    );
  } else if (venueQuery.isPending) {
    body = <ActivityIndicator accessibilityLabel={t('common.loading')} />;
  } else if (venueQuery.isError) {
    body = (
      <>
        <ErrorBanner message={venueQuery.error.message} />
        <Button onPress={() => void venueQuery.refetch()}>{t('common.retry')}</Button>
      </>
    );
  } else if (!ready || editingVenue) {
    body = (
      <VenueSetupForm
        key={`${venue?.id}:${venue?.address}:${venue?.latitude}:${venue?.longitude}`}
        userId={profile.id}
        profile={venue ?? null}
        defaultName={profile.display_name}
        onSaved={() => setEditingVenue(false)}
        onCancel={ready ? () => setEditingVenue(false) : undefined}
      />
    );
  } else {
    body = (
      <View style={styles.form}>
        <AppText variant="subheading">{venue.name}</AppText>
        <AppText muted>{venue.address}</AppText>
        <Button variant="ghost" disabled={publish.isPending} onPress={() => setEditingVenue(true)}>
          {t('events.create.changeVenue')}
        </Button>
        <AppText variant="caption" muted>
          {t('events.create.requiredHelp')}
        </AppText>
        <FormField
          label={t('events.create.gigTitle')}
          accessibilityLabel={t('events.create.gigTitle')}
          value={fields.title}
          onChangeText={(value) => change('title', value)}
          maxLength={200}
          editable={!publish.isPending}
        />
        {(['date', 'start', 'timeZone', 'endDate', 'end'] as const).map((field) => (
          <FormField
            key={field}
            label={t(`events.create.${field}`)}
            accessibilityLabel={t(`events.create.${field}`)}
            value={fields[field]}
            onChangeText={(value) => change(field, value)}
            placeholder={
              field === 'date' || field === 'endDate'
                ? 'YYYY-MM-DD'
                : field === 'timeZone'
                  ? 'Europe/London'
                  : 'HH:mm'
            }
            autoCapitalize="none"
            autoCorrect={false}
            editable={!publish.isPending}
          />
        ))}
        <AppText variant="caption" muted>
          {t('events.create.timeHelp')}
        </AppText>
        <FormField
          label={t('events.create.description')}
          accessibilityLabel={t('events.create.description')}
          value={fields.description}
          onChangeText={(value) => change('description', value)}
          multiline
          maxLength={2000}
          style={styles.description}
          editable={!publish.isPending}
        />
        <FormField
          label={t('events.create.ticketUrl')}
          accessibilityLabel={t('events.create.ticketUrl')}
          value={fields.ticketUrl}
          onChangeText={(value) => change('ticketUrl', value)}
          keyboardType="url"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={1000}
          editable={!publish.isPending}
        />
        <AppText variant="caption" muted>
          {t('events.create.publishHelp')}
        </AppText>
        <View accessibilityLiveRegion="polite">
          <ErrorBanner message={error ?? publicationError(publish.error)} />
        </View>
        {posterConfig.isError && (
          <>
            <ErrorBanner message={posterConfig.error.message} />
            <Button variant="secondary" onPress={() => void posterConfig.refetch()}>
              {t('events.poster.retryConfig')}
            </Button>
          </>
        )}
        {posterConfig.data?.enabled && (
          <PosterPicker
            selection={selection}
            onChange={setSelection}
            limits={posterConfig.data}
            disabled={busy}
          />
        )}
        <Button loading={publish.isPending} onPress={publishEvent}>
          {t('events.create.publish')}
        </Button>
      </View>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Button
            variant="ghost"
            disabled={busy || publish.recovering}
            onPress={() => (created ? void finish() : router.back())}
          >
            {t('common.back')}
          </Button>
          <AppText variant="heading">{t('events.create.heading')}</AppText>
          {body}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  form: { gap: spacing.md },
  description: { minHeight: 100, textAlignVertical: 'top' },
});
