import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderWithTheme } from '../../../utils/renderWithTheme';

import { VenueHome } from '@/features/home/venue/VenueHome';

const mockEvents = jest.fn();
const mockPosterConfig = jest.fn();
jest.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({ profile: { id: 'venue-1', role: 'venue' }, isGuest: false }),
}));
jest.mock('@/lib/api/events', () => ({ useVenueEvents: () => mockEvents() }));
jest.mock('@/lib/api/client', () => ({ isApiConfigured: () => true }));
jest.mock('@/lib/api/gig-posters', () => ({ usePosterConfig: () => mockPosterConfig() }));

describe('VenueHome', () => {
  beforeEach(() => {
    mockEvents.mockReturnValue({ isPending: false, isError: false, data: { items: [] } });
    mockPosterConfig.mockReturnValue({ data: { enabled: true }, isError: false });
    jest.clearAllMocks();
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

  it('shows the poster and opens management for an owned gig', () => {
    mockEvents.mockReturnValue({
      data: {
        items: [
          {
            id: 'event-1',
            venueId: 'venue-1',
            title: 'Friday comedy',
            startTime: '2027-02-12T20:00:00Z',
            posterUrl: 'https://storage.example.com/poster.png',
          },
        ],
      },
    });
    renderWithTheme(<VenueHome />);
    expect(screen.getByLabelText('events.poster.imageLabel').props.resizeMode).toBe('contain');
    fireEvent.press(screen.getByText('events.poster.manage'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/manage-gig-poster',
      params: { eventId: 'event-1' },
    });
  });

  it('keeps published artwork readable when poster mutations are disabled', () => {
    mockPosterConfig.mockReturnValue({ data: { enabled: false } });
    mockEvents.mockReturnValue({
      data: {
        items: [
          {
            id: 'event-1',
            venueId: 'venue-1',
            title: 'Friday comedy',
            startTime: '2027-02-12T20:00:00Z',
            posterUrl: 'https://storage.example.com/poster.png',
          },
        ],
      },
    });
    renderWithTheme(<VenueHome />);
    expect(screen.getByLabelText('events.poster.imageLabel')).toBeTruthy();
    expect(screen.queryByText('events.poster.manage')).toBeNull();
  });
});
