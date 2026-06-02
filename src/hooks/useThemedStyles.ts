import { useMemo } from 'react';

import { useTheme } from '@/providers/ThemeProvider';
import type { Theme } from '@/theme/types';

/**
 * Memoised themed styles hook.
 *
 * Pass a module-level factory function (defined outside the component so its
 * reference is stable) and get back a memoised styles object that is only
 * recomputed when the active theme changes.
 *
 * @example
 * const createStyles = (theme: Theme) =>
 *   StyleSheet.create({
 *     container: { backgroundColor: theme.colors.surface },
 *   });
 *
 * function MyComponent() {
 *   const styles = useThemedStyles(createStyles);
 *   return <View style={styles.container} />;
 * }
 */
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const { theme } = useTheme();
  return useMemo(() => factory(theme), [theme, factory]);
}
