import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { typography } from '@/theme/tokens';
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
  const styles = useThemedStyles(createStyles);
  return (
    <Text style={[styles.base, styles[variant], muted && styles.muted, style]} {...props}>
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
      fontSize: typography.title,
      fontWeight: '700',
    },
    heading: {
      fontSize: typography.heading,
      fontWeight: '600',
    },
    body: {
      fontSize: typography.body,
      fontWeight: '400',
    },
    caption: {
      fontSize: typography.caption,
      fontWeight: '400',
    },
  });
