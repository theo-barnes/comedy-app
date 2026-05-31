import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/theme';

type Props = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function FilterChips({ options, selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isActive = option === selected;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
            accessibilityState={{ selected: isActive }}
          >
            <AppText
              variant="caption"
              style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}
            >
              {option}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    gap: spacing.sm,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipInactive: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  label: {
    fontWeight: '500',
  },
  labelActive: {
    color: colors.background,
    fontWeight: '600',
  },
  labelInactive: {
    color: colors.foregroundMuted,
  },
});
