import { curtain } from './scale';
import { createRegisteredFontFamilies } from './FontRegister';
import type { ColorTokens } from './types';

/**
 * Midnight Studio · Curtain — dark mode colour tokens.
 * Primary walks the scale at 500 → 600 → 700.
 * Badges use a low-opacity 500 fill with 300 ink.
 */
export const darkTokens: ColorTokens = {
  // Surfaces
  surface: '#0E0E10',
  card: '#17171A',
  border: 'rgba(255,255,255,0.08)',

  // Typography
  textPrimary: '#F2F0EA',
  textMuted: '#8E8B84',

  // Primary interactive (500 → 600 → 700)
  primaryRest: curtain[500],
  primaryHover: curtain[600],
  primaryPressed: curtain[700],
  primaryDisabled: curtain[200],

  // Badges
  badgeFill: 'rgba(184,35,42,0.14)',
  badgeInk: curtain[300],

  // Errors (Curtain scale — no one-off hexes)
  errorFill: 'rgba(184,35,42,0.14)',
  errorInk: curtain[300],
  errorBorder: curtain[500],

  // Miscellaneous
  tintWash: 'rgba(251,241,240,0.06)',
  link: curtain[300],
  focusRing: curtain[500],
  // Curtain red is always dark enough — white text/icons pass WCAG AA on primaryRest.
  onPrimary: '#FFFFFF',
  overlayBorder: 'rgba(255,255,255,0.18)',
  overlayBorderActive: 'rgba(255,255,255,0.4)',
  onOverlay: '#FFFFFF',
  mediaScrimSoft: 'rgba(0, 0, 0, 0.13)',
  mediaScrimStrong: 'rgba(0,0,0,0.7)',
  livePanelSurface: '#181818',
  livePanelRow: 'rgba(255,255,255,0.07)',
  livePanelTextPrimary: '#F6F2EA',
  livePanelTextMuted: 'rgba(255,255,255,0.45)',
  livePanelAccent: curtain[300],

  // Shadows
  buttonShadow: '#000',
};

/**
 * Studio Daylight · Curtain — light mode colour tokens.
 * Primary walks the scale at 600 → 700 → 800 (one step deeper to hold contrast on cream).
 * Badges use solid 100 fill with 700 ink.
 */
export const lightTokens: ColorTokens = {
  // Surfaces
  surface: '#F5F3EE',
  card: '#FFFFFF',
  border: 'rgba(0,0,0,0.08)',

  // Typography
  textPrimary: '#1A1A1A',
  textMuted: '#6B6B6B',

  // Primary interactive (600 → 700 → 800)
  primaryRest: curtain[600],
  primaryHover: curtain[700],
  primaryPressed: curtain[800],
  primaryDisabled: curtain[200],

  // Badges
  badgeFill: curtain[100],
  badgeInk: curtain[700],

  // Errors (Curtain scale — no one-off hexes)
  errorFill: curtain[100],
  errorInk: curtain[700],
  errorBorder: curtain[600],

  // Miscellaneous
  tintWash: curtain[50],
  link: curtain[700],
  focusRing: curtain[600],
  onPrimary: '#FFFFFF',
  overlayBorder: 'rgba(0,0,0,0.18)',
  overlayBorderActive: 'rgba(0,0,0,0.4)',
  onOverlay: '#FFFFFF',
  mediaScrimSoft: 'rgba(127, 125, 125, 0)',
  mediaScrimStrong: 'rgba(0,0,0,0.7)',
  livePanelSurface: '#181818',
  livePanelRow: 'rgba(255,255,255,0.07)',
  livePanelTextPrimary: '#F6F2EA',
  livePanelTextMuted: 'rgba(255,255,255,0.45)',
  livePanelAccent: curtain[300],

  // Shadows
  buttonShadow: '#000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
};

/**
 * Shared metrics for top-level tab strips (e.g. FilterChips in browse/home).
 * These values are tuned to match the compact, editorial tab look used in app shells.
 */
export const navigationTabs = {
  containerHorizontalPadding: spacing.lg,
  containerTopPadding: spacing.xs,
  containerBorderWidth: 0,
  itemHorizontalPadding: 2,
  itemBottomPadding: 0,
  itemGap: spacing.lg,
  indicatorThickness: 1,
  labelFontSize: 14,
  labelLineHeight: 22,
  inactiveLabelWeight: '300',
  activeLabelWeight: '400',
} as const;

const typographyScale = {
  display: 32,
  title: 28,
  heading: 22,
  subheading: 18,
  body: 14,
  caption: 12,
  label: 11,
} as const;

export const createTypography = (fontsLoaded: boolean) => ({
  ...typographyScale,
  fontFamily: createRegisteredFontFamilies(fontsLoaded),
});

export const typography = createTypography(false);
