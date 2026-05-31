import { render, screen } from '@testing-library/react-native';

import { NextGigCard } from '@/features/home/comedian/NextGigCard';

const DEFAULT_PROPS = {
  daysUntil: 4,
  hoursUntil: 6,
  roleBadge: 'headliner' as const,
  showTitle: 'Store Nights: Friday Late',
  venue: 'The Comedy Store',
  date: 'Fri, 6 Jun',
  doorsTime: '8:30 PM',
  performerAvatars: [undefined] as Array<string | undefined>,
  onTheBillCount: 3,
};

describe('NextGigCard', () => {
  it('renders without crashing', () => {
    expect(() => render(<NextGigCard {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders the show title', () => {
    render(<NextGigCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('Store Nights: Friday Late')).toBeTruthy();
  });

  it('renders the days countdown', () => {
    render(<NextGigCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('renders the VIEW → link', () => {
    render(<NextGigCard {...DEFAULT_PROPS} />);
    // t('home.comedian.viewGig') returns key in tests
    expect(screen.getByText('home.comedian.viewGig')).toBeTruthy();
  });
});
