import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { TabScreenTemplate } from '@/components/TabScreenTemplate';
import { isApiConfigured } from '@/lib/api/client';
import { useSavedItems } from '@/lib/api/saved';
import { spacing } from '@/theme';

export default function SavedScreen() {
  const savedQuery = useSavedItems();

  if (!isApiConfigured()) {
    return (
      <TabScreenTemplate title="Saved" subtitle="Your saved gigs and comedians will appear here." />
    );
  }

  if (savedQuery.isLoading) {
    return (
      <TabScreenTemplate title="Saved">
        <View style={styles.center} testID="saved-loading">
          <ActivityIndicator />
        </View>
      </TabScreenTemplate>
    );
  }

  const items = savedQuery.data?.items ?? [];

  if (savedQuery.isError || items.length === 0) {
    return (
      <TabScreenTemplate
        title="Saved"
        subtitle={
          savedQuery.isError
            ? "We couldn't load your saved items. Pull to refresh or try again later."
            : 'Nothing saved yet. Tap the bookmark on any clip or show to keep it here.'
        }
      />
    );
  }

  return (
    <TabScreenTemplate title="Saved">
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
    </TabScreenTemplate>
  );
}

const styles = StyleSheet.create({
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
