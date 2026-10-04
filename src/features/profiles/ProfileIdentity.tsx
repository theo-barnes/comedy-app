import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  displayName: string;
};

/** Presentation-only identity shared by self and visited profile screens. */
export function ProfileIdentity({ displayName }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <AppText variant="title" style={styles.name}>
        @{displayName}
      </AppText>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
    },
    name: {
      color: theme.colors.textPrimary,
      fontWeight: '700',
    },
  });
