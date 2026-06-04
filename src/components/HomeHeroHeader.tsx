import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { spacing } from '@/theme';

export type HomeHeroHeaderProps = {
  title: string;
  subtitle: string;
};

export function HomeHeroHeader({ title, subtitle }: HomeHeroHeaderProps) {
  return (
    <View style={styles.container}>
      <AppText variant="title">{title}</AppText>
      <AppText muted>{subtitle}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
});
