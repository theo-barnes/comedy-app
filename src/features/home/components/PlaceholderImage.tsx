import { Image, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/providers/ThemeProvider';

type Props = {
  uri?: string;
  /** Layout styles applied identically to both the placeholder View and the Image. */
  style?: StyleProp<ViewStyle & ImageStyle>;
};

/**
 * Renders a React Native Image when a URI is supplied, or a neutral grey View
 * when it is not. Swap in real image URLs by populating the `uri` field — no
 * structural changes to the consuming component are required.
 */
export function PlaceholderImage({ uri, style }: Props) {
  const { theme } = useTheme();
  if (uri) {
    return <Image source={{ uri }} style={style} resizeMode="cover" />;
  }
  return <View style={[{ backgroundColor: theme.colors.card }, style]} />;
}
