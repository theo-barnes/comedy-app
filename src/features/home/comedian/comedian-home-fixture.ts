import type { BadgeVariant } from '@/features/home/components/Badge';

/**
 * Static fixture content for the comedian home screen, displayed until the
 * comedian dashboard API is wired up. All people, venues and events are
 * fictional.
 */
export const COMEDIAN_HOME_FIXTURE = {
  comedianName: 'Jane',
  nextGig: {
    daysUntil: 4,
    hoursUntil: 6,
    roleBadge: 'headliner' as BadgeVariant,
    showTitle: 'Friday Night Late Show',
    venue: 'The Punchline Club',
    date: 'Fri, 6 Jun',
    doorsTime: '8:30 PM',
    performerAvatars: [undefined, undefined, undefined] as (string | undefined)[],
    onTheBillCount: 3,
  },
  stats: [
    { id: '1', value: '1.4K', label: 'PROFILE VIEWS', delta: '+18% this week' },
    { id: '2', value: '3.2K', label: 'CLIP PLAYS', delta: '+31% this week' },
    { id: '3', value: '84', label: 'NEW FOLLOWERS', delta: '+12% this week' },
  ],
  tip: {
    title: 'Add more clips.',
    body: 'Profiles with 3+ clips get 4× more enquiries from promoters. You have 1.',
    progress: 1 / 3,
    step: 1,
    totalSteps: 3,
    ctaLabel: 'Upload',
  },
  gigs: [
    {
      id: '1',
      venue: 'The Punchline Club',
      date: 'Fri, 6 Jun · 9 PM',
      roleBadge: 'headliner' as BadgeVariant,
    },
    {
      id: '2',
      venue: 'Northside Theatre',
      date: 'Sat, 14 Jun · 8 PM',
      roleBadge: 'support' as BadgeVariant,
    },
  ],
  sameNightDate: 'FRI 6 JUN',
  sameNightEvents: [
    { id: '1', title: 'New Acts Night', subtitle: 'Brickhouse Comedy Club' },
    { id: '2', title: 'Thursday Late Sessions', subtitle: 'The Cellar Door' },
  ],
  othersOnCircuit: [
    { id: '1', name: 'John Doe', subtitle: '29.1K' },
    { id: '2', name: 'Sarah Brown', subtitle: '18.4K' },
    { id: '3', name: 'Tom Becker', subtitle: '11.2K' },
  ],
};
