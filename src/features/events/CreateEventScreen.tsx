import { router } from 'expo-router';
import { useRef, useState } from 'react';
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
import { useCreateNativeEvent, useMyCreatorProfile, type VenueEvent } from '@/lib/api/events';
import { spacing } from '@/theme/tokens';

import { nativeEventInputSchema } from './event-form';
import { VenueSetupForm } from './VenueSetupForm';

export function CreateEventScreen() {
  const { t } = useTranslation();
  const { profile, isLoading, isGuest } = useAuth();
  const allowed = !isGuest && profile?.role === 'venue';
  const venueQuery = useMyCreatorProfile(profile?.id, allowed);
  const publish = useCreateNativeEvent(profile?.id ?? 'anonymous');
  const publishing = useRef(false);
  const [editingVenue, setEditingVenue] = useState(false);
  const [created, setCreated] = useState<VenueEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      setCreated(await publish.mutateAsync(parsed.data));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('events.create.publishFailed'));
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
  } else if (venueQuery.isPending) {
    body = <ActivityIndicator accessibilityLabel={t('common.loading')} />;
  } else if (venueQuery.isError) {
    body = (
      <>
        <ErrorBanner message={venueQuery.error.message} />
        <Button onPress={() => void venueQuery.refetch()}>{t('common.retry')}</Button>
      </>
    );
  } else if (created) {
    body = (
      <View style={styles.form} accessibilityLiveRegion="polite">
        <AppText variant="heading">{t('events.create.successTitle')}</AppText>
        <AppText>{created.title}</AppText>
        <AppText>{t('events.create.successBody')}</AppText>
        <Button onPress={() => router.back()}>{t('events.create.returnHome')}</Button>
      </View>
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
          <ErrorBanner message={error} />
        </View>
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
          <Button variant="ghost" disabled={publish.isPending} onPress={() => router.back()}>
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
