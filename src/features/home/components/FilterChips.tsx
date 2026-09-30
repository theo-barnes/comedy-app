import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { GlassGroup, GlassSurface, useLiquidGlassSupport } from '@/components/GlassSurface';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
};

export function FilterChips({ options, selected, onSelect }: Props) {
  const styles = useThemedStyles(createStyles);
  const glassEnabled = useLiquidGlassSupport();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <GlassGroup style={styles.row}>
        {options.map((option) => {
          const isActive = option === selected;
          return (
            <Pressable
              key={option}
              onPress={() => onSelect(option)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              {isActive ? (
                <GlassSurface
                  testID={`filter-chip-glass-${option}`}
                  style={[styles.pill, !glassEnabled && styles.pillFallback]}
                >
                  <AppText variant="body" style={[styles.label, styles.labelActive]}>
                    {option}
                  </AppText>
                </GlassSurface>
              ) : (
                <View style={styles.pill}>
                  <AppText variant="body" style={[styles.label, styles.labelInactive]}>
                    {option}
                  </AppText>
                </View>
              )}
            </Pressable>
          );
        })}
      </GlassGroup>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    scroll: {
      // ScrollView defaults to flexGrow: 1 and would fill the page below the hero.
      flexGrow: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.navigationTabs.chipGap,
    },
    pill: {
      paddingHorizontal: theme.navigationTabs.chipPaddingHorizontal,
      paddingVertical: theme.navigationTabs.chipPaddingVertical,
      borderRadius: radii.pill,
    },
    pillFallback: {
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    label: {
      fontSize: theme.navigationTabs.labelFontSize,
      lineHeight: theme.navigationTabs.labelLineHeight,
      fontWeight: theme.navigationTabs.inactiveLabelWeight,
    },
    labelActive: {
      color: theme.colors.primaryRest,
      fontWeight: theme.navigationTabs.activeLabelWeight,
    },
    labelInactive: {
      color: theme.colors.textMuted,
    },
  });
