import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { SavedRecommendationItem } from '@/features/home/fan/SavedRecommendationItem';

const DEFAULT_PROPS = {
  title: 'Friday Night Late Show',
  venue: 'The Punchline Club',
  neighbourhood: 'Soho',
  date: 'Fri, 6 Jun',
  price: '£12',
  badges: ['hotTicket' as const],
};

describe('SavedRecommendationItem', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<SavedRecommendationItem {...DEFAULT_PROPS} />)).not.toThrow();
  });

  it('renders the show title', () => {
    renderWithTheme(<SavedRecommendationItem {...DEFAULT_PROPS} />);
    expect(screen.getByText('Friday Night Late Show')).toBeTruthy();
  });

  it('renders the price', () => {
    renderWithTheme(<SavedRecommendationItem {...DEFAULT_PROPS} />);
    expect(screen.getByText('£12')).toBeTruthy();
  });
});
