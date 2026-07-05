import type { BadgeVariant } from '@/features/home/components/Badge';
import type { UserRole } from '@/types';

import type { BrowseConfig } from './types';

const BASE_BROWSE_CONFIG: BrowseConfig = {
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
    id: 'storytellers-invitational',
    title: 'Six storytellers, one mic, no notes.',
    venue: 'The Old Chapel',
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
      id: 'late-night-brickhouse',
      badges: ['hotTicket'] as BadgeVariant[],
      date: 'Sat, 7 Jun · 10:30 PM',
      title: 'Late Night at the Brickhouse',
      venue: 'Brickhouse Comedy Club',
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
      venue: 'The Punchline Club',
      neighbourhood: 'W1',
      price: '£8',
      imageUri:
        'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80',
    },
  ],
  curator: {
    kicker: "THIS WEEK'S SPOTLIGHT",
    title: 'Maya Rivers picks six rooms worth crossing the river for.',
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
      title: 'Late Night at the Brickhouse',
      venue: 'Brickhouse Comedy Club',
      neighbourhood: 'N1',
      price: '£12',
      imageUri:
        'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'full-2',
      date: 'Tonight · 8:00 PM',
      title: 'New Material Mondays',
      venue: 'The Punchline Club',
      neighbourhood: 'W1',
      price: '£8',
      imageUri:
        'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'full-3',
      date: 'Thu, 5 Jun · 7:30 PM',
      title: 'The Main Room Showcase',
      venue: 'The Copper Tap',
      neighbourhood: 'SE1',
      price: '£15',
      imageUri:
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
    },
    {
      id: 'full-4',
      date: 'Fri, 6 Jun · 9:00 PM',
      title: 'Off The Cuff Improv',
      venue: 'The Cellar Door',
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
      { name: 'The Crooked Fox', value: '2 seats' },
      { name: 'The Laughing Goat', value: '8 seats' },
      { name: 'Basement Laughs', value: 'Standing' },
    ],
    cta: 'See all 218 shows',
  },
};

const ROLE_OVERRIDES: Record<UserRole, Partial<BrowseConfig>> = {
  fan: {},
  comedian: {},
  venue: {},
};

export function getBrowseConfig(role: UserRole): BrowseConfig {
  return {
    ...BASE_BROWSE_CONFIG,
    ...ROLE_OVERRIDES[role],
  };
}
