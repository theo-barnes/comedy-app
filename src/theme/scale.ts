/**
 * Curtain accent scale — the single source of truth for every red in the app.
 * Values are perceptually stepped from a barely-there cream-pink wash (50)
 * to a wine-shadow ink (900). No one-off hex values are permitted outside this scale.
 *
 * Usage: import { curtain } from '@/theme/scale';
 */
export const curtain = Object.freeze({
  /** Page tint — subtle background wash for hero strips, banners, very low-emphasis surfaces */
  50: '#FBF1F0',
  /** Soft fill — badge backgrounds with 700-level text, success/info toasts */
  100: '#F6DDDD',
  /** Disabled fill — disabled primary buttons, low-contrast tints, soft hover under tinted backgrounds */
  200: '#EDB7B7',
  /** Light hover — hover state for 100/200 surface lifts; muted icon fills inside cards */
  300: '#DC8888',
  /** Pressed fill — active/pressed state for tinted controls; secondary borders that need to read as red */
  400: '#C75056',
  /** Base — Curtain brand red. Primary buttons, links, active tabs, the core brand red. */
  500: '#B8232A',
  /** Hover · Light primary — hover state for primary buttons in dark mode; exact value used as primary rest in light mode */
  600: '#A0202A',
  /** Pressed · Deep ink — pressed state for primary buttons; body-of-text red for badge labels on 100-tinted surfaces */
  700: '#831A23',
  /** Velvet shadow — heavy text on cream surfaces, deep card outlines, dark hover for pressed states in light mode */
  800: '#66161D',
  /** Ink — reserved; heading-color red for editorial moments; destructive ink at maximum gravity */
  900: '#401015',
} as const);

export type CurtainStep = keyof typeof curtain;
