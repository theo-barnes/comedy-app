import { render, screen } from '@testing-library/react-native';

import { SavedRecommendationItem } from '@/features/home/fan/SavedRecommendationItem';

const DEFAULT_PROPS = {
  title: 'Store Nights: Friday Late',
  venue: 'The Comedy Store',
  neighbourhood: 'Soho',
  date: 'Fri, 6 Jun',
  price: '£12',
  badges: ['hotTicket' as const],
};

describe('SavedRecommendationItem', () => {
  it('renders without crashing', () => {
    expect(() => render(<SavedRecommendationItem {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders the show title', () => {
    render(<SavedRecommendationItem {...DEFAULT_PROPS} />);
    expect(screen.getByText('Store Nights: Friday Late')).toBeTruthy();
  });

  it('renders the price', () => {
    render(<SavedRecommendationItem {...DEFAULT_PROPS} />);
    expect(screen.getByText('£12')).toBeTruthy();
  });
});
