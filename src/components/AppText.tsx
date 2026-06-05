import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/providers/ThemeProvider';
import { resolveFontWeightFamily } from '@/theme/FontRegister';
import type { Theme } from '@/theme/types';

type AppTextProps = PropsWithChildren<TextProps> & {
  variant?: 'title' | 'heading' | 'body' | 'caption';
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
    variant === 'title'
      ? theme.typography.fontFamily.roles.title
      : variant === 'heading'
        ? theme.typography.fontFamily.roles.heading
        : variant === 'caption'
          ? theme.typography.fontFamily.roles.caption
          : theme.typography.fontFamily.roles.body;

  const resolvedFontFamily = explicitFamily ?? familyFromWeight ?? variantFamily;

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
    title: {
      fontSize: theme.typography.title,
      fontWeight: '700',
    },
    heading: {
      fontSize: theme.typography.heading,
      fontWeight: '600',
    },
    body: {
      fontSize: theme.typography.body,
      fontWeight: '400',
    },
    caption: {
      fontSize: theme.typography.caption,
      fontWeight: '400',
    },
  });
