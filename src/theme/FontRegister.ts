import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';
import type { TextStyle } from 'react-native';

export const fontRegister = {
  frauncesRegular: 'Fraunces-Regular',
  frauncesSemibold: 'Fraunces-SemiBold',
  frauncesBold: 'Fraunces-Bold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
} as const;

export type FontRegisterKey = keyof typeof fontRegister;

type FontWeights = {
  frauncesRegular: string | undefined;
  frauncesSemibold: string | undefined;
  frauncesBold: string | undefined;
  regular: string | undefined;
  medium: string | undefined;
  semibold: string | undefined;
  bold: string | undefined;
  extraBold: string | undefined;
};

export type RegisteredFontFamilies = {
  weights: FontWeights;
  roles: {
    title: string | undefined;
    heading: string | undefined;
    body: string | undefined;
    caption: string | undefined;
    button: string | undefined;
    link: string | undefined;
  };
};

function buildFontFamilyMap(fontsLoaded: boolean): FontWeights {
  if (!fontsLoaded) {
    return {
      frauncesRegular: undefined,
      frauncesSemibold: undefined,
      frauncesBold: undefined,
      regular: undefined,
      medium: undefined,
      semibold: undefined,
      bold: undefined,
      extraBold: undefined,
    };
  }

  return {
    frauncesRegular: fontRegister.frauncesRegular,
    frauncesSemibold: fontRegister.frauncesSemibold,
    frauncesBold: fontRegister.frauncesBold,
    regular: fontRegister.regular,
    medium: fontRegister.medium,
    semibold: fontRegister.semibold,
    bold: fontRegister.bold,
    extraBold: fontRegister.extraBold,
  };
}

export function createRegisteredFontFamilies(fontsLoaded: boolean): RegisteredFontFamilies {
  const weights = buildFontFamilyMap(fontsLoaded);
  return {
    weights,
    roles: {
      title: weights.frauncesBold,
      heading: weights.frauncesSemibold,
      body: weights.regular,
      caption: weights.regular,
      button: weights.semibold,
      link: weights.bold,
    },
  };
}

export function useAppFonts() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    'Fraunces-Regular': require('../../assets/fonts/Fraunces-Regular.ttf'),
    'Fraunces-SemiBold': require('../../assets/fonts/Fraunces-SemiBold.ttf'),
    'Fraunces-Bold': require('../../assets/fonts/Fraunces-Bold.ttf'),
  });

  if (__DEV__ && fontError) {
    console.warn('[FontRegister] Unable to load app fonts:', fontError);
  }

  return fontsLoaded;
}

export function resolveFontWeightFamily(
  fonts: RegisteredFontFamilies,
  fontWeight?: TextStyle['fontWeight'],
) {
  if (fontWeight === undefined || fontWeight === null) {
    return undefined;
  }

  if (fontWeight === 'normal') {
    return fonts.weights.regular;
  }

  if (fontWeight === 'bold') {
    return fonts.weights.bold;
  }

  const weight = typeof fontWeight === 'number' ? String(fontWeight) : fontWeight;
  switch (weight) {
    case '100':
    case '200':
    case '300':
    case '400':
      return fonts.weights.regular;
    case '500':
      return fonts.weights.medium;
    case '600':
      return fonts.weights.semibold;
    case '700':
      return fonts.weights.bold;
    case '800':
    case '900':
      return fonts.weights.extraBold;
    default:
      return undefined;
  }
}
