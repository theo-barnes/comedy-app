import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/providers/ThemeProvider';
import { resolveFontWeightFamily } from '@/theme/FontRegister';
import type { Theme } from '@/theme/types';

type AppTextProps = PropsWithChildren<TextProps> & {
  variant?: 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label';
  muted?: boolean;
};

export function AppText({
  children,
  variant = 'body',
  muted = false,
  style,
  ...props
}: AppTextProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
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
