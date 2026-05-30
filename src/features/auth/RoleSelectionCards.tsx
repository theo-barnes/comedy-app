import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/theme';
import { useRoleOptions } from '@/features/auth/useRoleOptions';
import type { UserRole } from '@/types';

type Props = {
  selectedRole: UserRole;
  onRoleChange: (role: UserRole) => void;
};

export function RoleSelectionCards({ selectedRole, onRoleChange }: Props) {
  const roleOptions = useRoleOptions();

  return (
    <View style={styles.container}>
      {roleOptions.map((opt) => {
        const isSelected = selectedRole === opt.role;
        return (
          <Pressable
            key={opt.role}
            style={[styles.card, isSelected && styles.cardSelected]}
            onPress={() => onRoleChange(opt.role)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={opt.label}
          >
            <View style={[styles.icon, isSelected && styles.iconSelected]}>
              <Ionicons
                name={opt.icon as any}
                size={22}
                color={isSelected ? colors.background : colors.foregroundMuted}
              />
            </View>
            <View style={styles.textBlock}>
              <AppText variant="body" style={styles.label}>
                {opt.label}
              </AppText>
              <AppText variant="caption" muted style={styles.description}>
                {opt.description}
              </AppText>
            </View>
            {isSelected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginBottom: spacing.md },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardSelected: { borderColor: colors.primary },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.sm,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: { backgroundColor: colors.primary },
  textBlock: { flex: 1 },
  label: { fontWeight: '700' },
  description: { marginTop: 2 },
});
