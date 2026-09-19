import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { VenueHome } from '@/features/home/venue/VenueHome';

describe('VenueHome', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<VenueHome />)).not.toThrow();
  });

  it('renders the venue shell title', () => {
    renderWithTheme(<VenueHome />);
    expect(screen.getByText('home.venue.yourShows')).toBeTruthy();
  });

  it('does not render fixture-driven sections', () => {
    renderWithTheme(<VenueHome />);
    expect(screen.queryByTestId('venue-home-featured-section')).toBeNull();
    expect(screen.queryByTestId('venue-home-other-events-section')).toBeNull();
    expect(screen.queryByTestId('venue-home-acts-section')).toBeNull();
  });
});
