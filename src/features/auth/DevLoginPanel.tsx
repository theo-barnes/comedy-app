import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useAuth } from '@/features/auth/useAuth';
import { radii, spacing } from '@/theme/tokens';
import type { UserRole } from '@/types';

const DEV_ROLES: { role: UserRole; label: string }[] = [
  { role: 'fan', label: 'Fan' },
  { role: 'comedian', label: 'Comedian' },
  { role: 'venue', label: 'Venue' },
];

/**
 * Development-only quick login panel. Renders null in production builds.
 * Lets you sign in as any role without creating a Supabase account.
 */
export function DevLoginPanel() {
  const { signInAsDevRole } = useAuth();

  if (!__DEV__) return null;

  return (
    <View style={styles.container}>
      <AppText variant="caption" style={styles.label}>
        DEV · Quick sign-in
      </AppText>
      <View style={styles.row}>
        {DEV_ROLES.map(({ role, label }) => (
          <Pressable
            key={role}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => signInAsDevRole(role)}
          >
            <AppText variant="caption" style={styles.buttonText}>
              {label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// Amber colour — visually distinct from app chrome, never seen in production
const DEV_AMBER = '#F0A500';

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: DEV_AMBER,
    gap: spacing.sm,
  },
  label: {
    color: DEV_AMBER,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.sm,
    backgroundColor: `${DEV_AMBER}1A`,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: `${DEV_AMBER}33`,
  },
  buttonText: {
    color: DEV_AMBER,
    fontWeight: '700',
  },
});
