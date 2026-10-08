import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppText } from '@/components/AppText';
import { useTheme } from '@/providers/ThemeProvider';

export function GigPosterImage({
  uri,
  label,
  style,
}: {
  uri?: string | null;
  label: string;
  style?: StyleProp<ViewStyle & ImageStyle>;
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const unavailable = !uri || failedUri === uri;
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }, style]}>
      {unavailable ? (
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${label}. ${t('events.poster.imageUnavailable')}`}
          style={styles.fallback}
        >
          <AppText variant="caption" muted>
            {t('events.poster.imageUnavailable')}
          </AppText>
        </View>
      ) : (
        <>
          <Image
            key={uri}
            source={{ uri }}
            resizeMode="contain"
            style={StyleSheet.absoluteFill}
            accessibilityLabel={label}
            onLoad={() => setLoadedUri(uri)}
            onError={() => setFailedUri(uri)}
          />
          {loadedUri !== uri && (
            <View style={styles.fallback}>
              <ActivityIndicator accessibilityLabel={t('common.loading')} />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { overflow: 'hidden' },
  fallback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
});
