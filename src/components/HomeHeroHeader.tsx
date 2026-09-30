import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { formatHeaderDate } from '@/lib/format';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing } from '@/theme';
import type { Theme } from '@/theme/types';

const BRAND_NAME = 'Cues';
const LOGO_SIZE = 24;

export type HomeHeroHeaderProps = {
  /** Injectable for deterministic tests; defaults to now. */
  date?: Date;
};

export function HomeHeroHeader({ date = new Date() }: HomeHeroHeaderProps) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        {/* Temporary logo until the brand asset lands. */}
        <Ionicons name="mic" size={LOGO_SIZE} color={theme.colors.primaryRest} />
        <AppText variant="title" accessibilityRole="header">
          {BRAND_NAME}
        </AppText>
      </View>
      {/* Title variant keeps the brand's family/weight/colour; only the size is reduced. */}
      <AppText variant="title" style={styles.date}>
        {formatHeaderDate(date, i18n.language)}
      </AppText>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xs,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    date: {
      fontSize: theme.typography.subheading,
      lineHeight: theme.typography.title,
    },
  });
