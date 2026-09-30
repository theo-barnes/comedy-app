import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { AppTabScreenLayout } from '@/components/layouts/AppTabScreenLayout';
import { useHeaderLocationLabel } from '@/features/location';
import { isApiConfigured } from '@/lib/api/client';
import { useSavedItems } from '@/lib/api/saved';
import { spacing } from '@/theme';

export default function SavedScreen() {
  const savedQuery = useSavedItems();
  const { cityLabel, onCityPress } = useHeaderLocationLabel();
  const apiConfigured = isApiConfigured();
  const items = savedQuery.data?.items ?? [];

  return (
    <AppTabScreenLayout
      city={cityLabel}
      onCityPress={onCityPress}
      tabLabel="Saved"
      bodyStyle={styles.body}
    >
      {!apiConfigured ? (
        <AppText variant="subheading" muted>
          Your saved gigs and comedians will appear here.
        </AppText>
      ) : savedQuery.isLoading ? (
        <View style={styles.center} testID="saved-loading">
          <ActivityIndicator />
        </View>
      ) : savedQuery.isError || items.length === 0 ? (
        <AppText variant="subheading" muted>
          {savedQuery.isError
            ? "We couldn't load your saved items. Pull to refresh or try again later."
            : 'Nothing saved yet. Tap the bookmark on any clip or show to keep it here.'}
        </AppText>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.contentId}
          contentContainerStyle={styles.list}
          refreshing={savedQuery.isRefetching}
          onRefresh={() => savedQuery.refetch()}
          renderItem={({ item }) => (
            <Card>
              <AppText variant="subheading">{item.title}</AppText>
              <AppText muted>
                {item.contentType === 'video_clip' ? 'Clip' : 'Post'} · saved{' '}
                {new Date(item.savedAt).toLocaleDateString()}
              </AppText>
            </Card>
          )}
        />
      )}
    </AppTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
});
