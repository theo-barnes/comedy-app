import { Image, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/theme';

type Props = {
  uri?: string;
  /** Layout styles applied identically to both the placeholder View and the Image. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Renders a React Native Image when a URI is supplied, or a neutral grey View
 * when it is not. Swap in real image URLs by populating the `uri` field — no
 * structural changes to the consuming component are required.
 */
export function PlaceholderImage({ uri, style }: Props) {
  if (uri) {
    // Image accepts the same layout properties as View; the cast is safe here
    // since callers only pass dimension / borderRadius styles.
    return <Image source={{ uri }} style={style as any} resizeMode="cover" />;
  }
  return <View style={[{ backgroundColor: colors.backgroundElevated }, style]} />;
}
