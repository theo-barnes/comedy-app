import { render, screen } from '@testing-library/react-native';

import { VenueHome } from '@/features/home/venue/VenueHome';

describe('VenueHome', () => {
  it('renders without crashing', () => {
    expect(() => render(<VenueHome />)).not.toThrow();
  });

  it('renders the YOUR OTHER EVENTS section header', () => {
    render(<VenueHome />);
    expect(screen.getByText('home.venue.yourOtherEvents')).toBeTruthy();
  });

  it('renders the FIND ACTS TO BOOK section header', () => {
    render(<VenueHome />);
    expect(screen.getByText('home.venue.findActs')).toBeTruthy();
  });
});
