import type { BadgeVariant } from '@/features/home/components/Badge';

/**
 * Static fixture content for the venue home screen, displayed until the
 * venue dashboard API is wired up. All people, venues and events are
 * fictional.
 */
export const VENUE_HOME_FIXTURE = {
  featuredShow: {
    title: 'The Storytellers Invitational',
    venue: 'The Velvet Curtain',
    date: 'Fri, 13 Jun',
    statusBadge: 'onSale' as BadgeVariant,
    ticketsSold: 186,
    totalTickets: 280,
    revenue: '£4,092',
    remaining: 94,
    onWaitlist: 47,
    progress: 186 / 280,
  },
  otherEvents: [
    {
      id: '1',
      title: 'Friday Night Late Show',
      venue: 'The Punchline Club',
      date: 'Fri, 6 Jun',
      statusBadge: 'soldOut' as BadgeVariant,
      progress: 1.0,
    },
    {
      id: '2',
      title: 'New Acts Night',
      venue: 'Brickhouse Comedy Club',
      date: 'Sat, 7 Jun',
      statusBadge: 'onSale' as BadgeVariant,
      progress: 0.69,
    },
    {
      id: '3',
      title: 'Thursday Late Sessions',
      venue: 'The Cellar Door',
      date: 'Thu, 5 Jun',
      statusBadge: 'onSale' as BadgeVariant,
      progress: 0.59,
    },
  ],
  actsFilter: ['All', 'Observational', 'Alt-Comedy', 'Storytelling'],
  acts: [
    { id: '1', name: 'Jane Smith', rating: 4.9, tagline: 'Sharp. Absurdist. Unavoidable.' },
    { id: '2', name: 'John Doe', rating: 4.7, tagline: 'Deadpan delivery. Dry as toast.' },
    {
      id: '3',
      name: 'Sarah Brown',
      rating: 4.8,
      tagline: 'Comedy for people with trust issues.',
    },
    {
      id: '4',
      name: 'Tom Becker',
      rating: 4.6,
      tagline: 'Observational. Relentless. Oddly charming.',
    },
  ],
  whatElse: [
    { id: '1', title: 'Friday Night Late Show', subtitle: 'The Punchline Club' },
    { id: '2', title: 'New Acts Night', subtitle: 'Brickhouse Comedy Club' },
    { id: '3', title: 'Thursday Late Sessions', subtitle: 'The Cellar Door' },
  ],
};
