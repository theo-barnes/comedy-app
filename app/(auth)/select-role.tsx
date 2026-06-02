import { useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/useAuth';
import { AuthScreenWrapper } from '@/features/auth/AuthScreenWrapper';
import { LogoHeader } from '@/features/auth/LogoHeader';
import { RoleSelectionCards } from '@/features/auth/RoleSelectionCards';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ErrorBanner } from '@/components/ErrorBanner';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';
import type { UserRole } from '@/types';

export default function SelectRoleScreen() {
  const { t } = useTranslation();
  const { updateUserRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('fan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const styles = useThemedStyles(createStyles);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await updateUserRole(selectedRole);
      // Nav guard detects profile.role is now set and routes to (tabs) automatically.
    } catch {
      setError(t('auth.selectRole.errorFallback'));
    } finally {
      setIsSubmitting(false);
    }
  }, [updateUserRole, selectedRole, t]);

  return (
    <AuthScreenWrapper>
      <LogoHeader />

      <AppText style={styles.heading}>{t('auth.selectRole.heading')}</AppText>
      <AppText variant="body" muted style={styles.subheading}>
        {t('auth.selectRole.subheading')}
      </AppText>

      <RoleSelectionCards selectedRole={selectedRole} onRoleChange={setSelectedRole} />

      <ErrorBanner message={error} />

      <Button onPress={handleSubmit} loading={isSubmitting} size="lg" style={styles.submitButton}>
        {t('auth.selectRole.submit')}
      </Button>
    </AuthScreenWrapper>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    heading: {
      fontSize: 32,
      fontWeight: '800',
      color: theme.colors.textPrimary,
      marginBottom: spacing.xs,
    },
    subheading: {
      marginBottom: spacing.lg,
    },
    submitButton: { marginTop: spacing.xl },
  });
