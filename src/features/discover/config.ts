import type { BadgeVariant } from '@/features/home/components/Badge';
import type { UserRole } from '@/types';

import type { DiscoverConfig } from './types';

const BASE_DISCOVER_CONFIG: DiscoverConfig = {
  city: 'London',
  sectionLabel: 'DISCOVER',
  defaultView: 'browse',
  modes: [
    { id: 'browse', label: 'Browse', icon: 'home-outline' },
    { id: 'clips', label: 'Clips', icon: 'grid-outline' },
    { id: 'map', label: 'Map', icon: 'map-outline' },
  ],
  browse: {
    heroTitle: 'Tonight, London is laughing.',
    searchPlaceholder: 'Comics, venues, postcodes...',
    days: [
      { id: 'mon', day: 'MON', date: '01', count: 18 },
      { id: 'tue', day: 'TUE', date: '02', count: 22 },
      { id: 'wed', day: 'WED', date: '03', count: 27 },
      { id: 'thu', day: 'THU', date: '04', count: 31 },
      { id: 'fri', day: 'FRI', date: '05', count: 44 },
    ],
    featuredGig: {
      id: 'moth-invitational',
      title: 'Six storytellers, one mic, no notes.',
      venue: 'Union Chapel',
      neighbourhood: 'Islington',
      date: 'Fri, 6 Jun',
      time: '8:00 PM',
      price: '£18',
      badges: ['onSale', 'hotTicket'] as BadgeVariant[],
      performerLabel: '6 storytellers',
      imageUri:
        'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&q=80',
    },
    trendingKicker: 'REFRESHED 4 MIN AGO',
    trendingShows: [
      {
        id: 'late-night-bill-murray',
        badges: ['hotTicket'] as BadgeVariant[],
        date: 'Sat, 7 Jun · 10:30 PM',
        title: 'Late Night at the Bill Murray',
        venue: 'Angel Comedy',
        neighbourhood: 'N1',
        price: '£12',
        imageUri:
          'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'new-material-mondays',
        badges: ['onSale'] as BadgeVariant[],
        date: 'Tonight · 8:00 PM',
        title: 'New Material Mondays',
        venue: 'The Comedy Store',
        neighbourhood: 'W1',
        price: '£8',
        imageUri:
          'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    curator: {
      kicker: "THIS WEEK'S SPOTLIGHT",
      title: 'Phil Wang picks six rooms worth crossing the river for.',
      avatarUris: [
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=256&q=80',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
      ],
      extraLabel: '+ 3 more',
      cta: 'See picks',
    },
    fullBillKicker: '218 SHOWS · THIS WEEK',
    fullBillShows: [
      {
        id: 'full-1',
        badges: ['hotTicket'] as BadgeVariant[],
        date: 'Sat, 7 Jun · 10:30 PM',
        title: 'Late Night at the Bill Murray',
        venue: 'Angel Comedy',
        neighbourhood: 'N1',
        price: '£12',
        imageUri:
          'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'full-2',
        date: 'Tonight · 8:00 PM',
        title: 'New Material Mondays',
        venue: 'The Comedy Store',
        neighbourhood: 'W1',
        price: '£8',
        imageUri:
          'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'full-3',
        date: 'Thu, 5 Jun · 7:30 PM',
        title: 'The Big Belly Showcase',
        venue: 'Underbelly',
        neighbourhood: 'SE1',
        price: '£15',
        imageUri:
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'full-4',
        date: 'Fri, 6 Jun · 9:00 PM',
        title: 'Off The Cuff Improv',
        venue: 'Up The Creek',
        neighbourhood: 'SE10',
        price: '£10',
        imageUri:
          'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=1200&q=80',
      },
    ],
    liveNow: {
      kicker: 'LIVE NOW',
      timeLabel: '21:14 BST',
      title: 'Three rooms still taking walk-ins.',
      venues: [
        { name: 'Camden Head', value: '2 seats' },
        { name: 'Hen & Chickens', value: '8 seats' },
        { name: 'Top Secret Comedy', value: 'Standing' },
      ],
      cta: 'See all 218 shows',
    },
  },
  clips: {
    categories: ['Following', 'For you', 'Local'],
    defaultCategory: 'For you',
    feed: [
      {
        id: 'clip-1',
        title: 'Crowd work at The Bill Murray',
        venueLine: 'Angel Comedy · 2h ago',
        viewerStat: '24K views',
        likeCount: '4.2K',
        commentCount: '318',
        imageUri:
          'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'clip-2',
        title: 'N1 minute set challenge',
        venueLine: 'Top Secret Comedy · 4h ago',
        viewerStat: '18K views',
        likeCount: '2.1K',
        commentCount: '94',
        imageUri:
          'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'clip-3',
        title: 'Best heckle comeback this week',
        venueLine: 'The Comedy Store · 8h ago',
        viewerStat: '39K views',
        likeCount: '8.7K',
        commentCount: '512',
        imageUri:
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'clip-4',
        title: 'Open mic debut — 0 to 5 minutes',
        venueLine: 'The Hideaway · 1h ago',
        viewerStat: '7.4K views',
        likeCount: '1.3K',
        commentCount: '71',
        imageUri:
          'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'clip-5',
        title: 'Late night closer at Soho Theatre',
        venueLine: 'Soho Theatre · 3h ago',
        viewerStat: '52K views',
        likeCount: '11K',
        commentCount: '843',
        imageUri:
          'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=1200&q=80',
      },
    ],
  },
  map: {
    searchPlaceholder: 'Within 30 min by tube',
    filters: ['Tonight', 'Free', 'Under £10', 'Late', 'Walk-in'],
  },
};

const ROLE_CONFIG_OVERRIDES: Record<UserRole, Partial<DiscoverConfig>> = {
  fan: {},
  comedian: {
    sectionLabel: 'DISCOVER',
  },
  venue: {
    sectionLabel: 'DISCOVER',
  },
};

export function getDiscoverConfig(role: UserRole): DiscoverConfig {
  return {
    ...BASE_DISCOVER_CONFIG,
    ...ROLE_CONFIG_OVERRIDES[role],
  };
}
