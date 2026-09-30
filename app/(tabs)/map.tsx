import { StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { AppTabScreenLayout } from '@/components/layouts/AppTabScreenLayout';
import { useHeaderLocationLabel } from '@/features/location';
import { spacing } from '@/theme';

export default function MapScreen() {
  const { cityLabel, onCityPress } = useHeaderLocationLabel();

  return (
    <AppTabScreenLayout
      city={cityLabel}
      onCityPress={onCityPress}
      tabLabel="Map"
      bodyStyle={styles.body}
    >
      <AppText variant="subheading" muted>
        A live map of local comedy shows is coming soon.
      </AppText>
    </AppTabScreenLayout>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
});
