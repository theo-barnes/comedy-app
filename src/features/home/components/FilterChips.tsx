import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function FilterChips({ options, selected, onSelect }: Props) {
  const styles = useThemedStyles(createStyles);
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      backgroundColor: theme.colors.primaryRest,
    },
    chipInactive: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: 'transparent',
    },
    label: {
      fontWeight: '500',
    },
    labelActive: {
      color: theme.colors.onPrimary,
      fontWeight: '600',
    },
    labelInactive: {
      color: theme.colors.textMuted,
    },
  });
