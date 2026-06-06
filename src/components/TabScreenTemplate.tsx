import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { spacing } from '@/theme';

type Props = PropsWithChildren<{
  title: string;
  titleVariant?: 'display' | 'title' | 'heading';
  subtitle?: string;
}>;

export function TabScreenTemplate({ title, titleVariant = 'heading', subtitle, children }: Props) {
  return (
    <Screen>
      <View style={styles.container}>
        <AppText variant={titleVariant}>{title}</AppText>
        {subtitle && (
          <AppText variant="subheading" muted>
            {subtitle}
          </AppText>
        )}
        {children}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
