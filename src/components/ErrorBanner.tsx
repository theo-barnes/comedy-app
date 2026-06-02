import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = { message: string | null };

export function ErrorBanner({ message }: Props) {
  const styles = useThemedStyles(createStyles);
  if (!message) return null;
  return (
    <AppText variant="caption" style={styles.banner}>
      {message}
    </AppText>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    banner: {
      color: theme.colors.errorInk,
      marginTop: spacing.md,
      textAlign: 'center',
    },
  });
