import { useState, useCallback, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/useAuth';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { colors, spacing, radii } from '@/theme';
import type { UserRole } from '@/types';

type RoleOption = { role: UserRole; label: string; description: string; icon: string };

export default function SelectRoleScreen() {
  const { t } = useTranslation();
  const { updateUserRole } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('fan');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roleOptions = useMemo(
    (): RoleOption[] => [
      {
        role: 'fan',
        label: t('auth.signUp.roleFanLabel'),
        description: t('auth.signUp.roleFanDescription'),
        icon: 'ticket-outline',
      },
      {
        role: 'comedian',
        label: t('auth.signUp.roleComedianLabel'),
        description: t('auth.signUp.roleComedianDescription'),
        icon: 'mic-outline',
      },
      {
        role: 'venue',
        label: t('auth.signUp.roleVenueLabel'),
        description: t('auth.signUp.roleVenueDescription'),
        icon: 'trending-up-outline',
      },
    ],
    [t],
  );

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
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoRow}>
          <Ionicons name="mic" size={20} color={colors.primary} />
          <AppText variant="caption" style={styles.logoText}>
            PUNCHLINE / BILLD
          </AppText>
        </View>

        <AppText style={styles.heading}>{t('auth.selectRole.heading')}</AppText>
        <AppText variant="body" muted style={styles.subheading}>
          {t('auth.selectRole.subheading')}
        </AppText>

        {/* Role selector */}
        <View style={styles.roleContainer}>
          {roleOptions.map((opt) => {
            const isSelected = selectedRole === opt.role;
            return (
              <Pressable
                key={opt.role}
                style={[styles.roleCard, isSelected && styles.roleCardSelected]}
                onPress={() => setSelectedRole(opt.role)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={opt.label}
              >
                <View style={[styles.roleIcon, isSelected && styles.roleIconSelected]}>
                  <Ionicons
                    name={opt.icon as any}
                    size={22}
                    color={isSelected ? colors.background : colors.foregroundMuted}
                  />
                </View>
                <View style={styles.roleTextBlock}>
                  <AppText variant="body" style={styles.roleLabel}>
                    {opt.label}
                  </AppText>
                  <AppText variant="caption" muted style={styles.roleDescription}>
                    {opt.description}
                  </AppText>
                </View>
                {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>

        {error && (
          <AppText variant="caption" style={styles.errorBanner}>
            {error}
          </AppText>
        )}

        <Button onPress={handleSubmit} loading={isSubmitting} size="lg" style={styles.submitButton}>
          {t('auth.selectRole.submit')}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  logoText: {
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
  },
  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  subheading: {
    marginBottom: spacing.lg,
  },
  roleContainer: { gap: spacing.sm, marginBottom: spacing.md },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  roleCardSelected: { borderColor: colors.primary },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconSelected: { backgroundColor: colors.primary },
  roleTextBlock: { flex: 1 },
  roleLabel: { fontWeight: '700' },
  roleDescription: { marginTop: 2 },
  errorBanner: {
    color: '#E05C5C',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  submitButton: { marginTop: spacing.xl },
});
