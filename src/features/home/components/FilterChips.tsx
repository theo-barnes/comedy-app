import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
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
            hitSlop={8}
            style={[styles.chip, isActive ? styles.chipActive : styles.chipInactive]}
            accessibilityState={{ selected: isActive }}
          >
            <AppText
              variant="body"
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
      paddingHorizontal: theme.navigationTabs.containerHorizontalPadding,
      paddingTop: theme.navigationTabs.containerTopPadding,
      borderBottomWidth: theme.navigationTabs.containerBorderWidth,
      borderBottomColor: theme.colors.border,
      flexDirection: 'row',
    },
    chip: {
      paddingHorizontal: theme.navigationTabs.itemHorizontalPadding,
      paddingBottom: theme.navigationTabs.itemBottomPadding,
      marginRight: theme.navigationTabs.itemGap,
      borderBottomWidth: theme.navigationTabs.indicatorThickness,
    },
    chipActive: {
      borderBottomColor: theme.colors.primaryRest,
    },
    chipInactive: {
      borderBottomColor: 'transparent',
    },
    label: {
      fontSize: theme.navigationTabs.labelFontSize,
      lineHeight: theme.navigationTabs.labelLineHeight,
      fontWeight: theme.navigationTabs.inactiveLabelWeight,
    },
    labelActive: {
      color: theme.colors.primaryRest,
      fontWeight: theme.navigationTabs.activeLabelWeight,
      // textShadowColor: 'rgba(0, 0, 0, 0.28)',
      // textShadowOffset: { width: 0, height: 1 },
      // textShadowRadius: 0.15,
    },
    labelInactive: {
      color: theme.colors.textMuted,
    },
  });
