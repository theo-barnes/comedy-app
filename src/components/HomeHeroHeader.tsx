import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { spacing } from '@/theme';

export type HomeHeroHeaderProps = {
  title: string;
};

export function HomeHeroHeader({ title }: HomeHeroHeaderProps) {
  return (
    <View style={styles.container}>
      <AppText variant="title">{title}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingTop: 0,
    paddingBottom: spacing.xs,
    //gap: spacing.xs,
  },
});
