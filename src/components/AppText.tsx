import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/providers/ThemeProvider';
import { resolveFontWeightFamily } from '@/theme/FontRegister';
import type { Theme } from '@/theme/types';

/**
 * AppText component is a customizable text component that supports various typography variants and theming.
 * It allows for the display of text with different styles, such as display, title, heading, subheading, body, caption, and label.
 * The component also supports muting the text color and resolving font families based on the theme and specified font weight.
 */
type AppTextProps = PropsWithChildren<TextProps> & {
  variant?: 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label';
  muted?: boolean;
};

/**
 * Exported AppText component that renders text with specified typography variant and theming.
 * This component uses the useTheme and useThemedStyles hooks to apply theme-based styles and resolve font families based on the provided variant and font weight.
 *
 * @param children - The text content to be displayed.
 * @param variant - The typography variant to apply (default is 'body').
 * @param muted - If true, applies a muted text color (default is false).
 * @param style - Additional styles to apply to the text.
 * @param props - Other TextProps to pass to the underlying Text component.
 *
 * @returns A React element representing the text.
 */
export function AppText({
  children,
  variant = 'body',
  muted = false,
  style,
  ...props
}: AppTextProps) {
  // Get the current theme and themed styles using custom hooks
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  // 'Flatten' (meaning to merge all styles into a single object) the provided style to extract fontFamily and fontWeight
  const flattenedStyle = StyleSheet.flatten(style);
  const explicitFamily = flattenedStyle?.fontFamily;
  const familyFromWeight = resolveFontWeightFamily(
    theme.typography.fontFamily,
    flattenedStyle?.fontWeight,
  );

  const variantFamily =
    variant === 'display' || variant === 'title'
      ? theme.typography.fontFamily.roles.title
      : variant === 'heading'
        ? theme.typography.fontFamily.roles.heading
        : variant === 'caption' || variant === 'label'
          ? theme.typography.fontFamily.roles.caption
          : theme.typography.fontFamily.roles.body;

  // Determine if the variant should lock the font family
  // If the variant is 'display', 'title', or 'heading', we lock the font family to the variant's family.
  // Otherwise, we allow the font family to be resolved based on the font weight.
  const lockVariantFamily = variant === 'display' || variant === 'title' || variant === 'heading';
  const resolvedFontFamily = explicitFamily
    ? explicitFamily
    : lockVariantFamily
      ? variantFamily
      : (familyFromWeight ?? variantFamily);

  return (
    <Text
      style={[
        styles.base,
        styles[variant],
        muted && styles.muted,
        resolvedFontFamily ? { fontFamily: resolvedFontFamily } : null,
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    base: {
      color: theme.colors.textPrimary,
    },
    muted: {
      color: theme.colors.textMuted,
    },
    display: {
      fontSize: theme.typography.display,
      lineHeight: 38,
      fontWeight: '800',
    },
    title: {
      fontSize: theme.typography.title,
      lineHeight: 34,
      fontWeight: '700',
    },
    heading: {
      fontSize: theme.typography.heading,
      lineHeight: 28,
      fontWeight: '600',
    },
    subheading: {
      fontSize: theme.typography.subheading,
      lineHeight: 24,
      fontWeight: '500',
    },
    body: {
      fontSize: theme.typography.body,
      lineHeight: 21,
      fontWeight: '400',
    },
    caption: {
      fontSize: theme.typography.caption,
      lineHeight: 17,
      fontWeight: '400',
    },
    label: {
      fontSize: theme.typography.label,
      lineHeight: 16,
      fontWeight: '600',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
  });
