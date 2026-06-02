import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { useTheme } from '@/providers/ThemeProvider';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';

type Props = {
  icon: string;
  iconColor?: string;
  iconSize?: number;
  title: string;
  titleVariant?: 'title' | 'heading';
  body: string;
  cta?: { label: string; onPress: () => void };
  /** Override container styles — use when embedding inside another screen rather than rendering standalone. */
  containerStyle?: StyleProp<ViewStyle>;
};

export function StatusScreen({
  icon,
  iconColor,
  iconSize = 48,
  title,
  titleVariant = 'heading',
  body,
  cta,
  containerStyle,
}: Props) {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const resolvedIconColor = iconColor ?? theme.colors.primaryRest;
  return (
    <View style={[styles.container, containerStyle]}>
      <Ionicons name={icon as any} size={iconSize} color={resolvedIconColor} />
      <AppText variant={titleVariant} style={styles.title}>
        {title}
      </AppText>
      <AppText variant="body" muted style={styles.body}>
        {body}
      </AppText>
      {cta && (
        <Button variant="secondary" size="md" onPress={cta.onPress} style={styles.button}>
          {cta.label}
        </Button>
      )}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    title: {
      fontWeight: '700',
      textAlign: 'center',
    },
    body: {
      textAlign: 'center',
      lineHeight: 24,
    },
    button: {
      marginTop: spacing.md,
      alignSelf: 'stretch',
    },
  });
