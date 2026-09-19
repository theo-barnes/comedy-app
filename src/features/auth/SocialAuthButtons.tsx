import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  onGooglePress: () => void;
  googleLoading?: boolean;
};

export function SocialAuthButtons({ onGooglePress, googleLoading = false }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <AppText variant="caption" muted>
          {t('auth.social.divider')}
        </AppText>
        <View style={styles.dividerLine} />
      </View>

      <Button
        variant="secondary"
        size="lg"
        onPress={onGooglePress}
        loading={googleLoading}
        icon={<Ionicons name="logo-google" size={18} color={theme.colors.textPrimary} />}
      >
        {t('auth.social.googleCta')}
      </Button>
    </>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: spacing.lg,
      gap: spacing.sm,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  });
