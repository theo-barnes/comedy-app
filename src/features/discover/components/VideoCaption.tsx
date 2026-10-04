import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';

type VideoCaptionProps = {
  creatorName: string;
  description?: string | null;
  onCreatorPress?: () => void;
};

export function VideoCaption({ creatorName, description, onCreatorPress }: VideoCaptionProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      {onCreatorPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${creatorName}'s profile`}
          hitSlop={8}
          onPress={onCreatorPress}
        >
          <AppText variant="label" style={styles.creator}>
            @{creatorName}
          </AppText>
        </Pressable>
      ) : (
        <AppText variant="label" style={styles.creator}>
          @{creatorName}
        </AppText>
      )}
      {description ? (
        <ScrollView
          style={expanded ? styles.expanded : undefined}
          scrollEnabled={expanded}
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="body" style={styles.caption} numberOfLines={expanded ? undefined : 3}>
            {description}
          </AppText>
        </ScrollView>
      ) : null}
      {description && description.length > 100 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show less caption' : 'Show more caption'}
          onPress={() => setExpanded((value) => !value)}
        >
          <AppText variant="label" style={styles.more}>
            {expanded ? 'less' : 'more...'}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    maxHeight: '30%',
  },
  creator: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  caption: {
    color: '#FFFFFF',
    lineHeight: 21,
  },
  expanded: {
    maxHeight: 240,
  },
  more: {
    color: 'rgba(255,255,255,0.78)',
  },
});
