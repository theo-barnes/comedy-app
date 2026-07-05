import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { NextGigCard } from '@/features/home/comedian/NextGigCard';

const DEFAULT_PROPS = {
  daysUntil: 4,
  hoursUntil: 6,
  roleBadge: 'headliner' as const,
  showTitle: 'Friday Night Late Show',
  venue: 'The Punchline Club',
  date: 'Fri, 6 Jun',
  doorsTime: '8:30 PM',
  performerAvatars: [undefined] as (string | undefined)[],
  onTheBillCount: 3,
};

describe('NextGigCard', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<NextGigCard {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders the show title', () => {
    renderWithTheme(<NextGigCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('Friday Night Late Show')).toBeTruthy();
  });

  it('renders the days countdown', () => {
    renderWithTheme(<NextGigCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('4')).toBeTruthy();
  });

  it('renders the VIEW → link', () => {
    renderWithTheme(<NextGigCard {...DEFAULT_PROPS} />);
    // t('home.comedian.viewGig') returns key in tests
    expect(screen.getByText('home.comedian.viewGig')).toBeTruthy();
  });
});
