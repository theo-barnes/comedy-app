import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography } from '@/theme';

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
  return (
    <Text style={[styles.base, styles[variant], muted && styles.muted, style]} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.foreground,
  },
  muted: {
    color: colors.foregroundMuted,
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
