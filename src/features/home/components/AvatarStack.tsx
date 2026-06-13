import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { radii, spacing } from '@/theme/tokens';
import type { Theme } from '@/theme/types';
import { PlaceholderImage } from './PlaceholderImage';

const AVATAR_SIZE = 28;
const OVERLAP = 8;

type Props = {
  /** Pass `undefined` entries for avatars without a real URI — renders a grey circle. */
  avatars: (string | undefined)[];
  label: string;
};

export function AvatarStack({ avatars, label }: Props) {
  const styles = useThemedStyles(createStyles);
  const displayed = avatars.slice(0, 3);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {displayed.map((uri, index) => (
          <View key={index} style={[styles.avatarWrapper, index > 0 && { marginLeft: -OVERLAP }]}>
            <PlaceholderImage uri={uri} style={styles.avatar} />
          </View>
        ))}
      </View>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarWrapper: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: theme.colors.surface,
      overflow: 'hidden',
    },
    avatar: {
      width: '100%',
      height: '100%',
    },
  });
