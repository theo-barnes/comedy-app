import type { UserRole } from '@/types';

import { getBrowseConfig } from '@/features/browse/config';
import type { DiscoverConfig } from './types';

/**
 * Role-independent discover content. The `browse` slice is intentionally
 * omitted here — it is sourced from the browse feature per-role in
 * `getDiscoverConfig`, keeping a single source of truth for browse data.
 * All venues and clips are fictional placeholder content.
 */
const BASE_DISCOVER_CONFIG: Omit<DiscoverConfig, 'browse'> = {
  city: 'London',
  sectionLabel: 'DISCOVER',
  clips: {
    feed: [
      {
        id: 'clip-1',
        title: 'Crowd work at the Brickhouse',
        venueLine: 'Brickhouse Comedy Club · 2h ago',
        viewerStat: '24K views',
        likeCount: '4.2K',
        commentCount: '318',
        imageUri:
          'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'clip-2',
        title: 'One-minute set challenge',
        venueLine: 'Basement Laughs · 4h ago',
        viewerStat: '18K views',
        likeCount: '2.1K',
        commentCount: '94',
        imageUri:
          'https://images.unsplash.com/photo-1527224857830-43a7acc85260?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'clip-3',
        title: 'Best heckle comeback this week',
        venueLine: 'The Punchline Club · 8h ago',
        viewerStat: '39K views',
        likeCount: '8.7K',
        commentCount: '512',
        imageUri:
          'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'clip-4',
        title: 'Open mic debut — 0 to 5 minutes',
        venueLine: 'The Side Door · 1h ago',
        viewerStat: '7.4K views',
        likeCount: '1.3K',
        commentCount: '71',
        imageUri:
          'https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?auto=format&fit=crop&w=1200&q=80',
      },
      {
        id: 'clip-5',
        title: 'Late night closer at Northside',
        venueLine: 'Northside Theatre · 3h ago',
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

export function getDiscoverConfig(role: UserRole): DiscoverConfig {
  return {
    ...BASE_DISCOVER_CONFIG,
    browse: getBrowseConfig(role),
  };
}
