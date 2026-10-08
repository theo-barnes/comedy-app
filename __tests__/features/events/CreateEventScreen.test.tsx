import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { geocodeAsync } from 'expo-location';

import { CreateEventScreen } from '@/features/events/CreateEventScreen';
import { VenueHome } from '@/features/home/venue/VenueHome';
import { ApiError, apiFetch, apiMutation, isApiConfigured } from '@/lib/api/client';
import type { CreatorProfile } from '@/lib/api/events';
import { renderWithTheme } from '../../utils/renderWithTheme';

const mockAuth = jest.fn();
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => mockAuth() }));
jest.mock('@/lib/api/client', () => ({
  ...jest.requireActual('@/lib/api/client'),
  apiFetch: jest.fn(),
  apiMutation: jest.fn(),
  isApiConfigured: jest.fn(() => true),
}));
jest.mock('expo-location', () => ({
  geocodeAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
}));

const venue: CreatorProfile = {
  id: 'venue-1',
  creatorType: 'venue',
  name: 'Comedy Cellar',
  address: '10 High Street, London',
  latitude: 51.5,
  longitude: -0.1,
  bio: 'A friendly room',
  genres: [],
  capacity: 120,
  verified: true,
};
const published = {
  id: 'event-1',
  venueId: 'venue-1',
  title: 'Friday comedy',
  startTime: '2027-02-12T20:00:00Z',
  status: 'scheduled',
  comedianIds: [],
};
const fetchMock = jest.mocked(apiFetch);
const mutationMock = jest.mocked(apiMutation);

async function showForm() {
  renderWithTheme(<CreateEventScreen />);
  await screen.findByLabelText('events.create.gigTitle');
}

function fillGig() {
  fireEvent.changeText(screen.getByLabelText('events.create.gigTitle'), 'Friday comedy');
  fireEvent.changeText(screen.getByLabelText('events.create.date'), '2027-02-12');
  fireEvent.changeText(screen.getByLabelText('events.create.start'), '20:00');
}

describe('CreateEventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockReset();
    mutationMock.mockReset();
    jest.mocked(isApiConfigured).mockReturnValue(true);
    mockAuth.mockReturnValue({
      profile: { id: 'venue-1', role: 'venue', display_name: 'Venue account' },
      isLoading: false,
      isGuest: false,
    });
    fetchMock.mockResolvedValue(venue);
    mutationMock.mockResolvedValue(published);
  });

  it('publishes once with the explicit venue timezone and no client ownership/location', async () => {
    await showForm();
    fillGig();
    const button = screen.getByText('events.create.publish');
    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    await screen.findByText('events.create.successTitle');
    expect(mutationMock).toHaveBeenCalledTimes(1);
    expect(mutationMock).toHaveBeenCalledWith(
      '/events/native',
      expect.objectContaining({
        body: {
          title: 'Friday comedy',
          localStartTime: '2027-02-12T20:00',
          timeZone: 'Europe/London',
        },
      }),
    );
    expect(screen.queryByText('events.create.publish')).toBeNull();
  });

  it('keeps form values and surfaces publication failure for retry', async () => {
    mutationMock.mockRejectedValueOnce(new ApiError('Start must be in the future', 422));
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('Start must be in the future');
    expect(screen.getByLabelText('events.create.gigTitle').props.value).toBe('Friday comedy');
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.create.successTitle');
    expect(mutationMock).toHaveBeenCalledTimes(2);
  });

  it('rejects an incomplete end date/time pair without submitting', async () => {
    await showForm();
    fillGig();
    fireEvent.changeText(screen.getByLabelText('events.create.end'), '23:00');
    fireEvent.press(screen.getByText('events.create.publish'));
    expect(screen.getByText('events.create.validation.endPair')).toBeTruthy();
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('requires setup for a missing venue profile and then opens the gig form', async () => {
    fetchMock.mockRejectedValueOnce(new ApiError('Profile missing', 404));
    mutationMock.mockResolvedValueOnce(venue);
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.create.setupTitle');
    fireEvent.changeText(screen.getByLabelText('events.create.venueName'), venue.name);
    fireEvent.changeText(screen.getByLabelText('events.create.address'), venue.address);
    fireEvent.changeText(screen.getByLabelText('events.create.latitude'), '51.5');
    fireEvent.changeText(screen.getByLabelText('events.create.longitude'), '-0.1');
    fireEvent.press(screen.getByText('events.create.saveVenue'));
    await screen.findByLabelText('events.create.gigTitle');
    expect(mutationMock).toHaveBeenCalledWith(
      '/creators/me',
      expect.objectContaining({
        body: expect.objectContaining({ name: venue.name, latitude: 51.5, longitude: -0.1 }),
      }),
    );
  });

  it('preserves existing venue metadata when correcting location', async () => {
    fetchMock.mockResolvedValueOnce({ ...venue, latitude: null, longitude: null });
    mutationMock.mockResolvedValueOnce(venue);
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.create.setupTitle');
    fireEvent.changeText(screen.getByLabelText('events.create.latitude'), '51.5');
    fireEvent.changeText(screen.getByLabelText('events.create.longitude'), '-0.1');
    fireEvent.press(screen.getByText('events.create.saveVenue'));
    await screen.findByLabelText('events.create.gigTitle');
    expect(mutationMock).toHaveBeenCalledWith(
      '/creators/me',
      expect.objectContaining({
        body: expect.objectContaining({ bio: venue.bio, capacity: venue.capacity, genres: [] }),
      }),
    );
  });

  it('surfaces a denied profile request rather than offering setup', async () => {
    fetchMock.mockRejectedValue(new ApiError('Forbidden', 403));
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('Forbidden');
    expect(screen.queryByText('events.create.setupTitle')).toBeNull();
  });

  it.each(['fan', 'comedian'])(
    'blocks %s accounts without fetching or publishing',
    async (role) => {
      mockAuth.mockReturnValue({ profile: { id: 'other', role }, isLoading: false });
      renderWithTheme(<CreateEventScreen />);
      expect(screen.getByText('events.create.permissionDenied')).toBeTruthy();
      await act(async () => {});
      expect(fetchMock).not.toHaveBeenCalled();
      expect(mutationMock).not.toHaveBeenCalled();
    },
  );

  it('blocks guest access even when a venue profile is present', () => {
    mockAuth.mockReturnValue({
      profile: { id: 'venue-1', role: 'venue' },
      isGuest: true,
      isLoading: false,
    });
    renderWithTheme(<CreateEventScreen />);
    expect(screen.getByText('events.create.permissionDenied')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('explains an unconfigured API instead of showing an endless loading state', () => {
    jest.mocked(isApiConfigured).mockReturnValue(false);
    renderWithTheme(<CreateEventScreen />);
    expect(screen.getByText('events.create.unconfigured')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('preserves venue input when saving fails', async () => {
    fetchMock.mockResolvedValueOnce({ ...venue, latitude: null });
    mutationMock.mockRejectedValueOnce(new ApiError('Venue save failed', 503));
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.create.setupTitle');
    fireEvent.changeText(screen.getByLabelText('events.create.latitude'), '51.5');
    fireEvent.press(screen.getByText('events.create.saveVenue'));
    await screen.findByText('Venue save failed');
    expect(screen.getByLabelText('events.create.latitude').props.value).toBe('51.5');
    await waitFor(() => expect(screen.queryByLabelText('events.create.gigTitle')).toBeNull());
  });

  it('looks up the entered venue address without using the phone location', async () => {
    fetchMock.mockResolvedValueOnce({ ...venue, latitude: null, longitude: null });
    jest.mocked(geocodeAsync).mockResolvedValueOnce([{ latitude: 51.5, longitude: -0.1 }]);
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.create.setupTitle');
    fireEvent.press(screen.getByText('events.create.findAddress'));
    await waitFor(() =>
      expect(screen.getByLabelText('events.create.latitude').props.value).toBe('51.5'),
    );
    expect(geocodeAsync).toHaveBeenCalledWith(venue.address);
    expect(screen.getByLabelText('events.create.longitude').props.value).toBe('-0.1');
  });

  it('does not silently select among multiple geocoding results', async () => {
    fetchMock.mockResolvedValueOnce({ ...venue, latitude: null, longitude: null });
    jest.mocked(geocodeAsync).mockResolvedValueOnce([
      { latitude: 51.5, longitude: -0.1 },
      { latitude: 52, longitude: 0 },
    ]);
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.create.setupTitle');
    fireEvent.press(screen.getByText('events.create.findAddress'));
    await screen.findByText('events.create.locationNotUnique');
    expect(screen.getByLabelText('events.create.latitude').props.value).toBe('');
  });

  it('invalidates old coordinates when changing a venue address', async () => {
    await showForm();
    fireEvent.press(screen.getByText('events.create.changeVenue'));
    fireEvent.changeText(screen.getByLabelText('events.create.address'), 'A different address');
    expect(screen.getByLabelText('events.create.latitude').props.value).toBe('');
    expect(screen.getByLabelText('events.create.longitude').props.value).toBe('');
    fireEvent.press(screen.getByText('events.create.saveVenue'));
    expect(screen.getByText('events.create.validation.venue')).toBeTruthy();
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('refreshes the real venue Home query after publishing from the form', async () => {
    let saved = false;
    fetchMock.mockImplementation(async (path) =>
      path === '/creators/me' ? venue : { items: saved ? [published] : [] },
    );
    mutationMock.mockImplementation(async () => {
      saved = true;
      return published;
    });
    renderWithTheme(
      <>
        <VenueHome />
        <CreateEventScreen />
      </>,
    );
    await screen.findByLabelText('events.create.gigTitle');
    await screen.findByText('venues.noEvents');
    fillGig();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.create.successTitle');
    await waitFor(() => expect(screen.getAllByText('Friday comedy')).toHaveLength(2));
    expect(screen.queryByText('venues.noEvents')).toBeNull();
  });
});
