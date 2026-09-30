import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { GlassIconButton } from '@/components/GlassIconButton';
import { GlassSurface, useLiquidGlassSupport } from '@/components/GlassSurface';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/providers/ThemeProvider';
import { radii } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (value: string) => void;
  /** Controlled open state; omit to let the bar manage it internally. */
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  placeholder?: string;
  openAccessibilityLabel?: string;
  closeAccessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Content shown while the search field is collapsed. */
  children: ReactNode;
};

/**
 * Row with a round search toggle pinned right. Opening slides a glass
 * search field out leftward over `children`; closing retracts it and
 * clears the query.
 */
export function ExpandingSearchBar({
  query,
  onQueryChange,
  onSubmit,
  isOpen: isOpenProp,
  onOpenChange,
  placeholder,
  openAccessibilityLabel,
  closeAccessibilityLabel,
  style,
  testID = 'expanding-search-bar',
  children,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const glassEnabled = useLiquidGlassSupport();
  const inputRef = useRef<TextInput>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const [slotWidth, setSlotWidth] = useState(0);
  const progress = useSharedValue(0);

  const isOpen = isOpenProp ?? internalOpen;
  const { openDurationMs, closeDurationMs } = theme.searchBar;

  useEffect(() => {
    progress.set(
      withTiming(
        isOpen ? 1 : 0,
        isOpen
          ? { duration: openDurationMs, easing: Easing.out(Easing.cubic) }
          : { duration: closeDurationMs, easing: Easing.in(Easing.cubic) },
      ),
    );
    if (isOpen) {
      inputRef.current?.focus();
    } else {
      inputRef.current?.blur();
    }
  }, [isOpen, progress, openDurationMs, closeDurationMs]);

  const fieldStyle = useAnimatedStyle(() => ({ width: slotWidth * progress.get() }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));

  const setOpen = (open: boolean) => {
    if (isOpenProp === undefined) setInternalOpen(open);
    onOpenChange?.(open);
  };

  const toggle = () => {
    if (isOpen) onQueryChange('');
    setOpen(!isOpen);
  };

  const onSlotLayout = (event: LayoutChangeEvent) => {
    setSlotWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={[styles.row, style]} testID={testID}>
      <View style={styles.slot} onLayout={onSlotLayout}>
        <Animated.View
          testID={`${testID}-content`}
          style={[contentStyle, { pointerEvents: isOpen ? 'none' : 'auto' }]}
          accessibilityElementsHidden={isOpen}
          importantForAccessibility={isOpen ? 'no-hide-descendants' : 'auto'}
        >
          {children}
        </Animated.View>
        <Animated.View
          testID={`${testID}-field`}
          style={[styles.field, fieldStyle, { pointerEvents: isOpen ? 'auto' : 'none' }]}
          accessibilityElementsHidden={!isOpen}
          importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
        >
          <GlassSurface style={[styles.pill, !glassEnabled && styles.pillFallback]}>
            <TextInput
              ref={inputRef}
              testID={`${testID}-input`}
              style={styles.input}
              value={query}
              onChangeText={onQueryChange}
              onSubmitEditing={() => onSubmit(query)}
              placeholder={placeholder ?? t('search.placeholder')}
              placeholderTextColor={theme.colors.textMuted}
              returnKeyType="search"
              autoCorrect={false}
              editable={isOpen}
            />
          </GlassSurface>
        </Animated.View>
      </View>
      <GlassIconButton
        testID={`${testID}-toggle`}
        iconName={isOpen ? 'close' : 'search'}
        onPress={toggle}
        accessibilityLabel={
          isOpen
            ? (closeAccessibilityLabel ?? t('common.close'))
            : (openAccessibilityLabel ?? t('common.search'))
        }
        accessibilityState={{ expanded: isOpen }}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.searchBar.gap,
    },
    slot: {
      flex: 1,
      justifyContent: 'center',
    },
    field: {
      position: 'absolute',
      right: 0,
      height: theme.searchBar.height,
      overflow: 'hidden',
    },
    pill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      borderRadius: radii.pill,
    },
    pillFallback: {
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    input: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: theme.searchBar.fontSize,
      padding: 0,
    },
  });
