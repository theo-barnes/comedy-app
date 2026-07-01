import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

/**
 * ErrorBanner component is a simple text banner that displays an error message.
 * It is designed to be used in forms or other UI elements where error feedback is needed.
 * @param message - The error message to be displayed. If null, the banner will not be rendered.
 * @returns A React element representing the error banner, or null if no message is provided.
 */
type Props = { message: string | null };

/**
 *
 * Exported ErrorBanner component that renders an error message in a styled text banner.
 * It uses the useThemedStyles hook to apply theme-based styles and ensures that the banner is only displayed when a message is provided.
 * @param message - The error message to be displayed. If null, the banner will not be rendered.
 * @returns A React element representing the error banner, or null if no message is provided.
 */
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
