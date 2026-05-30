import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { StatusScreen } from '@/components/StatusScreen';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();

  return (
    <StatusScreen
      icon="mail-outline"
      titleVariant="title"
      title={t('auth.verifyEmail.heading')}
      body={t('auth.verifyEmail.body')}
      cta={{
        label: t('auth.verifyEmail.backToSignIn'),
        onPress: () => router.replace('/(auth)/sign-in' as Href),
      }}
    />
  );
}
