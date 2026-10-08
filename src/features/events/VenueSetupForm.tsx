import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { FormField } from '@/components/FormField';
import { useSaveVenueProfile, type CreatorProfile } from '@/lib/api/events';
import { spacing } from '@/theme/tokens';

import { venueLocationSchema } from './event-form';

type Props = {
  userId: string;
  profile: CreatorProfile | null;
  defaultName: string;
  onSaved: () => void;
  onCancel?: () => void;
};

export function VenueSetupForm({ userId, profile, defaultName, onSaved, onCancel }: Props) {
  const { t } = useTranslation();
  const save = useSaveVenueProfile(userId);
  const busy = useRef(false);
  const [name, setName] = useState(profile?.name ?? defaultName);
  const [address, setAddress] = useState(profile?.address ?? '');
  const [latitude, setLatitude] = useState(profile?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState(profile?.longitude?.toString() ?? '');
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function locateAddress() {
    if (busy.current) return;
    if (!address.trim()) {
      setError(t('events.create.validation.address'));
      return;
    }
    busy.current = true;
    setLocating(true);
    setError(null);
    try {
      if (Platform.OS === 'android') {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setError(t('events.create.locationPermission'));
          return;
        }
      }
      const results = await Location.geocodeAsync(address.trim());
      const result = results[0];
      if (results.length !== 1 || !result) {
        setError(t('events.create.locationNotUnique'));
        return;
      }
      setLatitude(result.latitude.toString());
      setLongitude(result.longitude.toString());
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('events.create.locationFailed'));
    } finally {
      busy.current = false;
      setLocating(false);
    }
  }

  async function saveVenue() {
    if (busy.current) return;
    const parsed = venueLocationSchema.safeParse({ name, address, latitude, longitude });
    if (!parsed.success) {
      setError(t('events.create.validation.venue'));
      return;
    }
    busy.current = true;
    setError(null);
    try {
      await save.mutateAsync({
        ...parsed.data,
        bio: profile?.bio ?? null,
        genres: profile?.genres ?? [],
        capacity: profile?.capacity ?? null,
      });
      onSaved();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : t('events.create.saveVenueFailed'));
    } finally {
      busy.current = false;
    }
  }

  const disabled = locating || save.isPending;
  return (
    <View style={styles.form}>
      <AppText variant="heading">{t('events.create.setupTitle')}</AppText>
      <AppText muted>{t('events.create.setupBody')}</AppText>
      <FormField
        label={t('events.create.venueName')}
        accessibilityLabel={t('events.create.venueName')}
        value={name}
        onChangeText={setName}
        maxLength={120}
        editable={!disabled}
      />
      <FormField
        label={t('events.create.address')}
        accessibilityLabel={t('events.create.address')}
        value={address}
        onChangeText={(value) => {
          setAddress(value);
          setLatitude('');
          setLongitude('');
        }}
        maxLength={300}
        editable={!disabled}
        autoComplete="street-address"
      />
      {Platform.OS !== 'web' && (
        <Button variant="secondary" loading={locating} disabled={disabled} onPress={locateAddress}>
          {t('events.create.findAddress')}
        </Button>
      )}
      <AppText variant="caption" muted>
        {t('events.create.coordinatesHelp')}
      </AppText>
      <FormField
        label={t('events.create.latitude')}
        accessibilityLabel={t('events.create.latitude')}
        value={latitude}
        onChangeText={setLatitude}
        keyboardType="numbers-and-punctuation"
        editable={!disabled}
      />
      <FormField
        label={t('events.create.longitude')}
        accessibilityLabel={t('events.create.longitude')}
        value={longitude}
        onChangeText={setLongitude}
        keyboardType="numbers-and-punctuation"
        editable={!disabled}
      />
      <View accessibilityLiveRegion="polite">
        <ErrorBanner message={error} />
      </View>
      <Button loading={save.isPending} disabled={disabled} onPress={saveVenue}>
        {t('events.create.saveVenue')}
      </Button>
      {onCancel && (
        <Button variant="ghost" disabled={disabled} onPress={onCancel}>
          {t('common.cancel')}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.md } });
