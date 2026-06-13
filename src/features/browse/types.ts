import type { BadgeVariant } from '@/features/home/components/Badge';

export type DiscoverDay = {
  id: string;
  day: string;
  date: string;
  count?: number;
};

export type FeaturedGig = {
  id: string;
  title: string;
  venue: string;
  neighbourhood: string;
  date: string;
  time: string;
  price: string;
  badges: BadgeVariant[];
  performerLabel: string;
  imageUri: string;
};

export type BrowseShow = {
  id: string;
  badges?: BadgeVariant[];
  date: string;
  title: string;
  venue: string;
  neighbourhood: string;
  price: string;
  imageUri: string;
};

export type CuratorSpotlight = {
  kicker: string;
  title: string;
  avatarUris: string[];
  extraLabel: string;
  cta: string;
};

export type LiveNowPanel = {
  kicker: string;
  timeLabel: string;
  title: string;
  venues: {
    name: string;
    value: string;
  }[];
  cta: string;
};

export type BrowseConfig = {
  heroTitle: string;
  searchPlaceholder: string;
  days: DiscoverDay[];
  featuredGig: FeaturedGig;
  trendingKicker: string;
  trendingShows: BrowseShow[];
  curator: CuratorSpotlight;
  fullBillKicker: string;
  fullBillShows: BrowseShow[];
  liveNow: LiveNowPanel;
};
