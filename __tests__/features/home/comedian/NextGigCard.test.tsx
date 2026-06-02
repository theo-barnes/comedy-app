import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

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
    expect(() => renderWithTheme(<NextGigCard {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders the show title', () => {
    renderWithTheme(<NextGigCard {...DEFAULT_PROPS} />);
    expect(screen.getByText('Store Nights: Friday Late')).toBeTruthy();
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
