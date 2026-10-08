import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { VenueHome } from '@/features/home/venue/VenueHome';

const mockEvents = jest.fn();
jest.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ profile: { id: 'venue-1', role: 'venue' }, isGuest: false }),
}));
jest.mock('@/lib/api/events', () => ({ useVenueEvents: () => mockEvents() }));
jest.mock('@/lib/api/client', () => ({ isApiConfigured: () => true }));

describe('VenueHome', () => {
  beforeEach(() => {
    mockEvents.mockReturnValue({ isPending: false, isError: false, data: { items: [] } });
  });
  it('renders without crashing', () => {
    expect(() => renderWithTheme(<VenueHome />)).not.toThrow();
  });

  it('renders the shared brand header', () => {
    renderWithTheme(<VenueHome />);
    expect(screen.getByText('Cues')).toBeTruthy();
  });

  it('does not render fixture-driven sections', () => {
    renderWithTheme(<VenueHome />);
    expect(screen.queryByTestId('venue-home-featured-section')).toBeNull();
    expect(screen.queryByTestId('venue-home-other-events-section')).toBeNull();
    expect(screen.queryByTestId('venue-home-acts-section')).toBeNull();
  });

  it('opens the native gig creation page', () => {
    renderWithTheme(<VenueHome />);
    fireEvent.press(screen.getByText('events.create.heading'));
    expect(router.push).toHaveBeenCalledWith('/create-event');
  });

  it('renders published venue events without inventing ticket-sales statistics', () => {
    mockEvents.mockReturnValue({
      data: {
        items: [{ id: 'event-1', title: 'Friday comedy', startTime: '2027-02-12T20:00:00Z' }],
      },
    });
    renderWithTheme(<VenueHome />);
    expect(screen.getByText('Friday comedy')).toBeTruthy();
    expect(screen.getByText(/UTC/)).toBeTruthy();
    expect(screen.queryByText('0%')).toBeNull();
  });

  it('identifies cancelled events returned by the venue listing', () => {
    mockEvents.mockReturnValue({
      data: {
        items: [
          {
            id: 'event-1',
            title: 'Friday comedy',
            startTime: '2027-02-12T20:00:00Z',
            status: 'cancelled',
          },
        ],
      },
    });
    renderWithTheme(<VenueHome />);
    expect(screen.getByText('events.cancelled')).toBeTruthy();
  });
});
