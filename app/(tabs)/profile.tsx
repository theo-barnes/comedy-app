import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { TabScreenTemplate } from '@/components/TabScreenTemplate';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useTheme } from '@/providers/ThemeProvider';
import { radii, spacing } from '@/theme/tokens';
import type { Theme, ThemeMode } from '@/theme/types';

const DEV_THEME_OPTIONS: ThemeMode[] = ['light', 'dark', 'system'];

export default function ProfileScreen() {
  const { themeMode, colorScheme, setThemeMode } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <TabScreenTemplate title="Profile" subtitle="Account, comedian tools, and settings.">
      {__DEV__ && (
        <View style={styles.devPanel}>
          <AppText variant="caption" style={styles.devLabel}>
            DEV THEME SWITCHER
          </AppText>
          <AppText variant="caption" muted>
            Mode: {themeMode} · Resolved: {colorScheme}
          </AppText>
          <View style={styles.row}>
            {DEV_THEME_OPTIONS.map((mode) => {
              const selected = themeMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => {
                    void setThemeMode(mode);
                  }}
                  style={({ pressed }) => [
                    styles.option,
                    selected && styles.optionSelected,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <AppText
                    variant="caption"
                    style={[styles.optionText, selected && styles.optionTextSelected]}
                  >
                    {mode.toUpperCase()}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </TabScreenTemplate>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    devPanel: {
      marginTop: spacing.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.colors.primaryRest,
      borderRadius: radii.md,
      padding: spacing.md,
      gap: spacing.sm,
      backgroundColor: theme.colors.card,
    },
    devLabel: {
      color: theme.colors.primaryRest,
      letterSpacing: 0.7,
      fontWeight: '700',
    },
    row: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    option: {
      flex: 1,
      height: 36,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
    },
    optionSelected: {
      borderColor: theme.colors.primaryRest,
      backgroundColor: theme.colors.primaryRest,
    },
    optionPressed: {
      opacity: 0.9,
    },
    optionText: {
      color: theme.colors.textMuted,
      fontWeight: '600',
    },
    optionTextSelected: {
      color: theme.colors.onPrimary,
    },
  });
