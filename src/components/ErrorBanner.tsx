import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { spacing } from '@/theme';

type Props = { message: string | null };

export function ErrorBanner({ message }: Props) {
  if (!message) return null;
  return (
    <AppText variant="caption" style={styles.banner}>
      {message}
    </AppText>
  );
}

const styles = StyleSheet.create({
  banner: {
    color: '#E05C5C',
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
