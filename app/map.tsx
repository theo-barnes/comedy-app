import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { BackButton } from '@/components/BackButton';
import { Screen } from '@/components/Screen';
import { useTheme } from '@/providers/ThemeProvider';
import { radii, spacing } from '@/theme';
import type { Theme } from '@/theme/types';
import { useThemedStyles } from '@/hooks/useThemedStyles';

const MAP_FILTERS = ['Tonight', 'Free', 'Under £10', 'Late', 'Walk-in'] as const;

export default function MapScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Screen>
      <View style={styles.root}>
        {/* Header */}
        <View style={styles.header}>
          <BackButton style={styles.backButton} />
          <AppText variant="heading" style={styles.headerTitle}>
            Map
          </AppText>
        </View>

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRowContent}
        >
          {MAP_FILTERS.map((filter, index) => (
            <Pressable
              key={filter}
              accessibilityRole="button"
              style={[styles.filterChip, index === 0 && styles.filterChipActive]}
            >
              <AppText
                variant="label"
                style={[styles.filterChipText, index === 0 && styles.filterChipTextActive]}
              >
                {filter}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Map canvas */}
        <View style={styles.mapCanvas}>
          <View style={styles.zoomControls}>
            <Pressable
              style={styles.zoomButton}
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
            >
              <Ionicons name="add" size={24} color={theme.colors.textPrimary as string} />
            </Pressable>
            <View style={styles.zoomDivider} />
            <Pressable
              style={styles.zoomButton}
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
            >
              <Ionicons name="remove" size={24} color={theme.colors.textPrimary as string} />
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    backButton: {
      marginBottom: 0,
    },
    headerTitle: {
      fontWeight: '700',
      flex: 1,
    },
    filterRowContent: {
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      paddingTop: spacing.sm,
    },
    filterChip: {
      paddingHorizontal: spacing.md,
      height: 38,
      borderRadius: radii.pill,
      justifyContent: 'center',
      backgroundColor: theme.colors.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primaryPressed,
      borderColor: theme.colors.primaryPressed,
    },
    filterChipText: {
      color: theme.colors.textPrimary,
      fontWeight: '600',
    },
    filterChipTextActive: {
      color: theme.colors.onPrimary,
    },
    mapCanvas: {
      flex: 1,
      marginHorizontal: spacing.md,
      marginBottom: spacing.lg,
      borderRadius: radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      padding: spacing.md,
    },
    zoomControls: {
      width: 54,
      borderRadius: radii.md,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    zoomButton: {
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    zoomDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
  });
