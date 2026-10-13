import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ErrorBanner } from '@/components/ErrorBanner';
import { NarrationButton } from '@/features/accessibility/NarrationButton';
import { useAuth } from '@/features/auth/useAuth';
import { GigPosterImage } from '@/features/events/GigPosterImage';
import { HomeScreenLayout } from '@/features/home/components/HomeScreenLayout';
import { getApiErrorMessage, isApiConfigured } from '@/lib/api/client';
import { useVenueEvents } from '@/lib/api/events';
import { spacing } from '@/theme/tokens';

export function VenueHome() {
  const { t, i18n } = useTranslation();
  const { profile, isGuest } = useAuth();
  const allowed = !isGuest && profile?.role === 'venue';
  const events = useVenueEvents(profile?.id, allowed);
  return (
    <HomeScreenLayout>
      <View style={styles.content}>
        {allowed && (
          <Button onPress={() => router.push('/create-event')}>{t('events.create.heading')}</Button>
        )}
        <AppText variant="subheading">{t('venues.eventsHere')}</AppText>
        {!isApiConfigured() ? (
          <AppText muted>{t('events.create.unconfigured')}</AppText>
        ) : events.isPending ? (
          <AppText muted>{t('common.loading')}</AppText>
        ) : events.isError ? (
          <>
            <ErrorBanner message={getApiErrorMessage(events.error, t)} />
            <Button variant="secondary" onPress={() => void events.refetch()}>
              {t('common.retry')}
            </Button>
          </>
        ) : events.data?.items.length === 0 ? (
          <AppText muted>{t('venues.noEvents')}</AppText>
        ) : (
          events.data?.items.map((event) => (
            <Card key={event.id}>
              <AppText variant="subheading">{event.title}</AppText>
              {event.publicationStatus === 'draft' && (
                <AppText>{t('events.poster.needsImage')}</AppText>
              )}
              {event.posterUrl && (
                <GigPosterImage
                  uri={event.posterUrl}
                  label={t('events.poster.imageLabel', { title: event.title })}
                  style={styles.poster}
                />
              )}
              {event.status === 'cancelled' && <AppText>{t('events.cancelled')}</AppText>}
              <AppText muted>
                {new Intl.DateTimeFormat(i18n.language, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'UTC',
                }).format(new Date(event.startTime))}{' '}
                UTC
              </AppText>
              {event.description ? <AppText>{event.description}</AppText> : null}
              {event.publicationStatus === 'published' && event.status === 'scheduled' ? (
                <NarrationButton resourceType="event" resourceId={event.id} label={event.title} />
              ) : null}
              {allowed && event.venueId === profile.id && (
                <Button
                  variant="secondary"
                  onPress={() =>
                    event.publicationStatus === 'draft'
                      ? router.push({ pathname: '/create-event', params: { draftId: event.id } })
                      : router.push({
                          pathname: '/manage-gig-poster',
                          params: { eventId: event.id },
                        })
                  }
                >
                  {t(
                    event.publicationStatus === 'draft'
                      ? 'events.poster.completeGig'
                      : 'events.poster.manage',
                  )}
                </Button>
              )}
            </Card>
          ))
        )}
      </View>
    </HomeScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  poster: { width: '100%', height: 220 },
});
