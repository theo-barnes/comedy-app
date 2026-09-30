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
 * Shared metrics for horizontal filter-chip rows (e.g. FilterChips on Home).
 * The selected chip renders as a glass pill; inactive chips are plain labels.
 */
export const navigationTabs = {
  containerHorizontalPadding: spacing.lg,
  containerTopPadding: spacing.xs,
  chipPaddingHorizontal: spacing.md,
  chipPaddingVertical: 6,
  chipGap: spacing.sm,
  labelFontSize: 14,
  labelLineHeight: 22,
  inactiveLabelWeight: '300',
  activeLabelWeight: '400',
} as const;

/** Metrics for the collapsible glass search bar and its round toggle. */
export const searchBar = {
  height: 36,
  iconSize: 18,
  fontSize: 14,
  gap: spacing.sm,
  openDurationMs: 320,
  closeDurationMs: 260,
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
