import { StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { AppText } from '@/components/AppText';
import { colors, spacing } from '@/theme';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Ionicons name="mail-outline" size={48} color={colors.primary} />
      <AppText variant="title" style={styles.heading}>
        {t('auth.verifyEmail.heading')}
      </AppText>
      <AppText variant="body" muted style={styles.body}>
        {t('auth.verifyEmail.body')}
      </AppText>
      <Button
        variant="secondary"
        size="md"
        onPress={() => router.replace('/(auth)/sign-in' as Href)}
        style={styles.button}
      >
        {t('auth.verifyEmail.backToSignIn')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  heading: {
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});
