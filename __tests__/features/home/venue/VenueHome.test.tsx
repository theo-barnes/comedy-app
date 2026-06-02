import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { VenueHome } from '@/features/home/venue/VenueHome';

describe('VenueHome', () => {
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<VenueHome />)).not.toThrow();
  });

  it('renders the YOUR OTHER EVENTS section header', () => {
    renderWithTheme(<VenueHome />);
    expect(screen.getByText('home.venue.yourOtherEvents')).toBeTruthy();
  });

  it('renders the FIND ACTS TO BOOK section header', () => {
    renderWithTheme(<VenueHome />);
    expect(screen.getByText('home.venue.findActs')).toBeTruthy();
  });
});
