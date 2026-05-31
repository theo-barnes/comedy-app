import { render, screen } from '@testing-library/react-native';

import { FeaturedShowCard } from '@/features/home/venue/FeaturedShowCard';

const DEFAULT_PROPS = {
  title: 'The Moth Invitational',
  venue: 'The Moth Club',
  date: 'Fri, 13 Jun',
  statusBadge: 'onSale' as const,
  ticketsSold: 186,
  totalTickets: 280,
  revenue: '£4,092',
  remaining: 94,
  onWaitlist: 47,
  progress: 186 / 280,
};

describe('FeaturedShowCard', () => {
  it('renders without crashing', () => {
    expect(() => render(<FeaturedShowCard {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders the show title', () => {
    render(<FeaturedShowCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('The Moth Invitational')).toBeTruthy();
  });

  it('renders the revenue', () => {
    render(<FeaturedShowCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('£4,092')).toBeTruthy();
  });

  it('renders all four action button labels', () => {
    render(<FeaturedShowCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('home.venue.addAct')).toBeTruthy();
    expect(screen.getByText('home.venue.share')).toBeTruthy();
    expect(screen.getByText('home.venue.promote')).toBeTruthy();
    expect(screen.getByText('home.venue.edit')).toBeTruthy();
  });
});
