import { Platform, StyleSheet, View } from 'react-native';
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
  onApplePress: () => void;
  googleLoading?: boolean;
  appleLoading?: boolean;
};

export function SocialAuthButtons({
  onGooglePress,
  onApplePress,
  googleLoading = false,
  appleLoading = false,
}: Props) {
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

      {Platform.OS === 'ios' && (
        <Button
          variant="secondary"
          size="lg"
          onPress={onApplePress}
          loading={appleLoading}
          icon={<Ionicons name="logo-apple" size={18} color={theme.colors.textPrimary} />}
          style={styles.appleButton}
        >
          {t('auth.social.appleCta')}
        </Button>
      )}
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
    appleButton: { marginTop: spacing.md },
  });
