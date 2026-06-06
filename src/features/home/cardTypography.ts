import type { TextStyle } from 'react-native';

type AppTextVariant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'caption' | 'label';

type CardTextSpec = {
  variant: AppTextVariant;
  numberOfLines?: number;
  style?: TextStyle;
};

/**
 * Shared typography roles for Home card components.
 * Keeps compact cards readable without oversized titles.
 */
export const homeCardTypography = {
  eventCardTitle: {
    variant: 'body',
    numberOfLines: 2,
    style: { fontWeight: '600', lineHeight: 19 },
  },
  eventCardSubtitle: {
    variant: 'caption',
    numberOfLines: 1,
  },
  compactTileTitle: {
    variant: 'body',
    numberOfLines: 2,
    style: { fontWeight: '600' },
  },
  compactTileSubtitle: {
    variant: 'caption',
    numberOfLines: 1,
  },
  compactNameTitle: {
    variant: 'caption',
    numberOfLines: 2,
    style: { fontWeight: '600' },
  },
  mediaCardTitle: {
    variant: 'subheading',
    numberOfLines: 2,
    style: { fontWeight: '600' },
  },
  clipCardTitle: {
    variant: 'body',
    numberOfLines: 2,
    style: { fontWeight: '600', lineHeight: 20 },
  },
  clipCardSubtitle: {
    variant: 'caption',
    numberOfLines: 1,
  },
  mediaCardSubtitle: {
    variant: 'caption',
    numberOfLines: 1,
  },
  rowTitle: {
    variant: 'body',
    numberOfLines: 1,
    style: { fontWeight: '600' },
  },
  eventListTitle: {
    variant: 'body',
    numberOfLines: 1,
    style: { fontWeight: '600', lineHeight: 20 },
  },
  eventListMeta: {
    variant: 'caption',
    numberOfLines: 1,
  },
  rowSubtitle: {
    variant: 'caption',
    numberOfLines: 1,
  },
  featuredTitle: {
    variant: 'subheading',
    numberOfLines: 2,
    style: { fontWeight: '700' },
  },
  featuredMeta: {
    variant: 'caption',
    numberOfLines: 1,
  },
  metricValue: {
    variant: 'heading',
    numberOfLines: 1,
    style: { fontWeight: '700' },
  },
  countdownValue: {
    variant: 'heading',
    numberOfLines: 1,
    style: { fontWeight: '700' },
  },
  nextGigCountdownValue: {
    variant: 'subheading',
    numberOfLines: 1,
    style: { fontWeight: '700' },
  },
  bannerTitle: {
    variant: 'subheading',
    numberOfLines: 2,
    style: { fontWeight: '700' },
  },
  nextGigTitle: {
    variant: 'subheading',
    numberOfLines: 2,
    style: { fontWeight: '600' },
  },
} satisfies Record<string, CardTextSpec>;
