import type { BadgeVariant } from '@/features/home/components/Badge';

/**
 * Static fallback content for the fan home screen.
 *
 * `FanHome` prefers live data from the home-feed API and falls back to this
 * fixture per-section while the backend feed has no data for the user's
 * location. All people, venues and events are fictional.
 */
export const FAN_HOME_FIXTURE = {
  featured: {
    title: 'Friday Night Late Show',
    venue: 'The Punchline Club',
    neighbourhood: 'Soho',
    date: 'Fri, 6 Jun',
    time: '9:00 PM',
    price: '£18',
    badges: ['hotTicket', 'lateNight', 'soldOut'] as BadgeVariant[],
    performerAvatars: [undefined, undefined, undefined] as (string | undefined)[],
    performerLabel: '3 performers',
  },
  thisWeek: [
    { id: '1', title: 'Friday Night Late Show', subtitle: 'The Punchline Club · Soho' },
    { id: '2', title: 'New Acts Night', subtitle: 'Brickhouse Comedy Club' },
    { id: '3', title: 'Thursday Late Sessions', subtitle: 'The Cellar Door · Greenwich' },
  ],
  performersNearYou: [
    { id: '1', name: 'Jane Smith', subtitle: 'The Punchline Club' },
    { id: '2', name: 'John Doe', subtitle: 'The Cellar Door' },
    { id: '3', name: 'Sarah Brown', subtitle: 'Brickhouse Comedy Club' },
  ],
  freshClips: [
    {
      id: '1',
      title: 'The Algorithm Knows Too Much',
      comedianName: 'Jane Smith',
      viewCount: '128K views',
      duration: '3:42',
    },
    {
      id: '2',
      title: 'Flat Hunting Is A Contact Sport',
      comedianName: 'John Doe',
      viewCount: '84K views',
      duration: '4:17',
    },
  ],
  becauseYouSaved: {
    name: 'Jane',
    items: [
      {
        id: '1',
        title: 'Thursday Late Sessions',
        venue: 'The Cellar Door',
        neighbourhood: 'Greenwich',
        date: 'Thu, 5 Jun',
        price: '£10',
        badges: ['weekly', 'lateNight'] as BadgeVariant[],
      },
      {
        id: '2',
        title: 'The Storytellers Invitational',
        venue: 'The Velvet Curtain',
        neighbourhood: 'Hackney',
        date: 'Fri, 13 Jun',
        price: '£22',
        badges: ['curated', 'premium'] as BadgeVariant[],
      },
    ],
  },
};
