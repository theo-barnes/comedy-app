import type { spacing, radii, typography, navigationTabs } from './tokens';

/**
 * Semantic colour roles — every key has a clearly defined job.
 * Components depend on ColorTokens, never on concrete colour values.
 */
export interface ColorTokens {
  // ── Surfaces ──────────────────────────────────────────────────
  /** Page-level background */
  surface: string;
  /** Lifted card surface, one step above surface */
  card: string;
  /** Hairline separator / container border */
  border: string;

  // ── Typography ────────────────────────────────────────────────
  /** Primary body and heading text */
  textPrimary: string;
  /** Secondary / meta / caption text */
  textMuted: string;

  // ── Primary interactive (Curtain scale, mode-shifted) ─────────
  /** Rest state — buttons, links, active tabs */
  primaryRest: string;
  /** Hover state */
  primaryHover: string;
  /** Pressed / active state */
  primaryPressed: string;
  /** Disabled state fill */
  primaryDisabled: string;

  // ── Badges ────────────────────────────────────────────────────
  /** Badge background fill */
  badgeFill: string;
  /** Badge label ink */
  badgeInk: string;

  // ── Errors (mapped to Curtain scale — no one-off hexes) ───────
  /** Error / destructive background fill */
  errorFill: string;
  /** Error text / icon ink */
  errorInk: string;
  /** Error input border */
  errorBorder: string;

  // ── Miscellaneous ─────────────────────────────────────────────
  /** Whisper-of-warmth hero strip / empty-state backdrop */
  tintWash: string;
  /** Inline hyperlink colour */
  link: string;
  /** Keyboard / accessibility focus ring */
  focusRing: string;
  /**
   * Foreground colour for content placed directly on a `primaryRest` background
   * (e.g. button labels, selected icon tints, active chip text).
   * Named semantically so a future palette change is one-line safe.
   */
  onPrimary: string;
  /** Overlay border on top of media surfaces */
  overlayBorder: string;
  /** Active overlay border on top of media surfaces */
  overlayBorderActive: string;
  /** Foreground text/icon colour on top of media surfaces */
  onOverlay: string;

  /** Soft media scrim (e.g. image footer overlays) */
  mediaScrimSoft: string;
  /** Strong media scrim (e.g. compact duration pills) */
  mediaScrimStrong: string;

  /** Live panel elevated surface used in browse sections */
  livePanelSurface: string;
  /** Row surface within live panel cards */
  livePanelRow: string;
  /** Primary text on live panel surfaces */
  livePanelTextPrimary: string;
  /** Muted text on live panel surfaces */
  livePanelTextMuted: string;
  /** Accent text on live panel surfaces */
  livePanelAccent: string;

  buttonShadow: string;
}

/** Spacing scale — mode-agnostic */
export type Spacing = typeof spacing;
/** Radii scale — mode-agnostic */
export type Radii = typeof radii;
/** Typography scale — mode-agnostic */
export type Typography = typeof typography;
/** Navigation tab metrics — mode-agnostic */
export type NavigationTabs = typeof navigationTabs;

/**
 * A complete resolved theme — the abstraction all components depend on.
 * Components should destructure only the slices they need.
 */
export interface Theme {
  colors: ColorTokens;
  spacing: Spacing;
  radii: Radii;
  typography: Typography;
  navigationTabs: NavigationTabs;
}
