import type { BadgeVariant } from '@/features/home/components/Badge';

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
