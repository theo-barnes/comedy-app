import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { geocodeAsync } from 'expo-location';
import { router } from 'expo-router';

import { CreateEventScreen } from '@/features/events/CreateEventScreen';
import { VenueHome } from '@/features/home/venue/VenueHome';
import { ApiError, apiFetch, apiMutation, isApiConfigured } from '@/lib/api/client';
import type { CreatorProfile } from '@/lib/api/events';
import { publicationJournalKey } from '@/features/events/event-publication';
import { IncompleteStoredValueError, LargeSecureStore } from '@/lib/large-secure-store';
import { renderWithTheme } from '../../utils/renderWithTheme';

const mockAuth = jest.fn();
const mockJournal = new Map<string, string>();
const mockUpload = jest.fn();
const mockPickPoster = jest.fn();
const mockConfig = jest.fn();
const mockRecoveryEvent = jest.fn();
const mockFetchEvent = jest.fn();
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '33a98d45-d21a-42ad-8cf2-bf7382e923f8'),
}));
jest.mock('@/lib/large-secure-store', () => ({
  IncompleteStoredValueError: class extends Error {},
  LargeSecureStore: {
    getItem: jest.fn(async (key: string) => mockJournal.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockJournal.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockJournal.delete(key);
    }),
  },
}));
jest.mock('@/lib/api/gig-posters', () => ({
  usePosterConfig: () => mockConfig(),
  useEvent: (...args: unknown[]) => mockRecoveryEvent(...args),
  fetchEvent: (...args: unknown[]) => mockFetchEvent(...args),
}));
jest.mock('@/features/events/poster-picker', () => ({
  pickPoster: (...args: unknown[]) => mockPickPoster(...args),
}));
jest.mock('@/features/events/poster-upload', () => ({
  useGigPosterUpload: () => ({
    upload: mockUpload,
    isPending: false,
    status: 'idle',
    progress: 0,
    cancel: jest.fn(),
    error: null,
  }),
}));
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
const selection = {
  uri: 'file:///poster.jpg',
  contentType: 'image/jpeg',
  fileSize: 100,
  width: 100,
  height: 200,
};

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
    mockJournal.clear();
    mockConfig.mockReturnValue({ data: { enabled: false }, isError: false });
    mockRecoveryEvent.mockReturnValue({ data: undefined, isPending: false, error: null });
    mockUpload.mockReset();
    mockFetchEvent.mockReset().mockResolvedValue(published);
    mockPickPoster.mockReset();
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

  function enablePosters() {
    mockConfig.mockReturnValue({
      data: {
        enabled: true,
        maxBytes: 10 * 1024 * 1024,
        maxPixels: 25_000_000,
        supportedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
      },
      isError: false,
    });
    mockPickPoster.mockResolvedValue(selection);
  }

  it('publishes then attaches a selected poster without another create request', async () => {
    enablePosters();
    mockUpload.mockResolvedValue({ ...published, posterUrl: 'https://posters.test/ready.jpg' });
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.poster.choose'));
    await screen.findByLabelText('events.poster.selectedPreview');
    fireEvent.press(screen.getByText('events.create.publish'));
    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(published, selection));
    expect(mutationMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText('events.poster.retryUpload')).toBeNull());
    expect(JSON.parse(mockJournal.get(publicationJournalKey('venue-1'))!).eventId).toBe('event-1');
  });

  it('makes partial success explicit and retries only poster attachment', async () => {
    enablePosters();
    mockUpload
      .mockRejectedValueOnce(new Error('Upload interrupted'))
      .mockResolvedValueOnce({ ...published, posterUrl: 'https://posters.test/ready.jpg' });
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.poster.choose'));
    await screen.findByLabelText('events.poster.selectedPreview');
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.poster.partialSuccess');
    expect(screen.getByText('Upload interrupted')).toBeTruthy();
    fireEvent.press(screen.getByText('events.poster.retryUpload'));
    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(2));
    expect(mutationMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes the created event after a conflict and explicitly retries with its fresh revision', async () => {
    enablePosters();
    mockUpload
      .mockRejectedValueOnce(new ApiError('Attachment conflicted', 409))
      .mockResolvedValueOnce({
        ...published,
        posterUrl: 'https://posters.test/new.jpg',
        posterRevision: 5,
      });
    mockFetchEvent.mockResolvedValueOnce({ ...published, posterRevision: 4 });
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.poster.choose'));
    await screen.findByLabelText('events.poster.selectedPreview');
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('Attachment conflicted');
    await waitFor(() => expect(mockFetchEvent).toHaveBeenCalledWith('event-1'));
    await act(async () => {});
    expect(mockUpload).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('events.poster.retryUpload'));
    await waitFor(() =>
      expect(mockUpload).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'event-1', posterRevision: 4 }),
        selection,
      ),
    );
    expect(mutationMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces reconciliation failure separately and refreshes before permitting an attachment retry', async () => {
    enablePosters();
    mockUpload.mockRejectedValueOnce(new Error('Attachment response lost'));
    mockFetchEvent
      .mockRejectedValueOnce(new Error('Refresh offline'))
      .mockResolvedValueOnce({ ...published, posterRevision: 4 });
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.poster.choose'));
    await screen.findByLabelText('events.poster.selectedPreview');
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('Refresh offline');
    expect(screen.getByText('Attachment response lost')).toBeTruthy();
    expect(screen.getByText('events.poster.refreshFailed')).toBeTruthy();
    fireEvent.press(screen.getByText('events.poster.retryUpload'));
    expect(mockUpload).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('events.poster.refreshConflict'));
    await waitFor(() => expect(screen.queryByText('Refresh offline')).toBeNull());
    expect(mockFetchEvent).toHaveBeenCalledTimes(2);
    expect(mutationMock).toHaveBeenCalledTimes(1);
  });

  it('recognizes an attachment committed before a lost response without repeating gig creation', async () => {
    enablePosters();
    mockUpload.mockRejectedValueOnce(new Error('Attachment response lost'));
    mockFetchEvent.mockResolvedValueOnce({
      ...published,
      posterUrl: 'https://posters.test/committed.jpg',
      posterRevision: 1,
    });
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.poster.choose'));
    await screen.findByLabelText('events.poster.selectedPreview');
    fireEvent.press(screen.getByText('events.create.publish'));
    await waitFor(() => expect(mockFetchEvent).toHaveBeenCalledWith('event-1'));
    await waitFor(() => expect(screen.queryByText('events.poster.retryUpload')).toBeNull());
    expect(screen.getByText('events.create.successTitle')).toBeTruthy();
    expect(screen.queryByText('events.poster.partialSuccess')).toBeNull();
    expect(mutationMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    new Error('Network response lost'),
    new ApiError('Conflicting publication', 409),
    new ApiError('Server unavailable', 503),
  ])('replays an ambiguous create with the same key and immutable payload: %s', async (failure) => {
    mutationMock.mockRejectedValueOnce(failure);
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText(failure.message);
    expect(screen.queryByLabelText('events.create.gigTitle')).toBeNull();
    const record = JSON.parse(mockJournal.get(publicationJournalKey('venue-1'))!);
    expect(record.input.title).toBe('Friday comedy');
    fireEvent.press(screen.getByText('events.poster.retryPublication'));
    await screen.findByText('events.create.successTitle');
    expect(mutationMock).toHaveBeenCalledTimes(2);
    expect(mutationMock.mock.calls[0]?.[1]).toEqual(mutationMock.mock.calls[1]?.[1]);
  });

  it('recovers a created journal before showing a blank form and asks to reselect', async () => {
    mockJournal.set(
      publicationJournalKey('venue-1'),
      JSON.stringify({
        version: 1,
        key: '33a98d45-d21a-42ad-8cf2-bf7382e923f8',
        input: {
          title: published.title,
          localStartTime: '2027-02-12T20:00',
          timeZone: 'Europe/London',
        },
        eventId: published.id,
        posterWanted: true,
      }),
    );
    mockRecoveryEvent.mockImplementation((id) => ({
      data: id ? published : undefined,
      isPending: false,
      error: null,
    }));
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.create.successTitle');
    expect(screen.getByText('events.poster.reselectAfterRestart')).toBeTruthy();
    expect(screen.queryByLabelText('events.create.gigTitle')).toBeNull();
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('does not clear another account journal or expose its publication after switching', async () => {
    const view = renderWithTheme(<CreateEventScreen />);
    await screen.findByLabelText('events.create.gigTitle');
    fillGig();
    let resolveCreate!: (event: typeof published) => void;
    mutationMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
    fireEvent.press(screen.getByText('events.create.publish'));
    await waitFor(() => expect(mutationMock).toHaveBeenCalledTimes(1));
    mockAuth.mockReturnValue({ profile: { id: 'venue-2', role: 'venue' }, isLoading: false });
    view.rerender(<CreateEventScreen />);
    await act(async () => resolveCreate(published));
    await screen.findByLabelText('events.create.gigTitle');
    expect(screen.queryByText('events.create.successTitle')).toBeNull();
    expect(mockJournal.has(publicationJournalKey('venue-1'))).toBe(true);
    expect(mockJournal.has(publicationJournalKey('venue-2'))).toBe(false);
  });

  it('surfaces journal clearing errors and does not navigate', async () => {
    const { LargeSecureStore } = jest.requireMock('@/lib/large-secure-store');
    LargeSecureStore.removeItem.mockRejectedValueOnce(new Error('Secure storage unavailable'));
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.create.successTitle');
    fireEvent.press(screen.getByText('events.create.returnHome'));
    await screen.findByText('Secure storage unavailable');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('persists the publication before POST and blocks POST when secure storage fails', async () => {
    jest
      .mocked(LargeSecureStore.setItem)
      .mockRejectedValueOnce(new Error('Cannot save recovery key'));
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('Cannot save recovery key');
    expect(mutationMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText('events.create.gigTitle').props.value).toBe('Friday comedy');
  });

  it('recovers an ambiguous request after remount and explicitly replays its original key', async () => {
    const key = 'ee9964bd-2d10-4f1a-a009-598a4a055a39';
    const input = {
      title: 'Saved gig',
      localStartTime: '2020-01-01T20:00',
      timeZone: 'Europe/London',
    };
    mockJournal.set(
      publicationJournalKey('venue-1'),
      JSON.stringify({
        version: 1,
        key,
        input,
        posterWanted: true,
      }),
    );
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.poster.pendingTitle');
    expect(screen.queryByLabelText('events.create.gigTitle')).toBeNull();
    expect(mutationMock).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('events.poster.retryPublication'));
    await screen.findByText('events.create.successTitle');
    expect(mutationMock).toHaveBeenCalledWith(
      '/events/native',
      expect.objectContaining({
        body: input,
        idempotencyKey: key,
      }),
    );
  });

  it('allows corrections only after a definitive validation rejection clears the journal', async () => {
    const { randomUUID } = jest.requireMock('expo-crypto');
    randomUUID
      .mockReturnValueOnce('ee9964bd-2d10-4f1a-a009-598a4a055a39')
      .mockReturnValueOnce('33a98d45-d21a-42ad-8cf2-bf7382e923f8');
    mutationMock.mockRejectedValueOnce(new ApiError('Invalid title', 422));
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('Invalid title');
    expect(mockJournal.has(publicationJournalKey('venue-1'))).toBe(false);
    fireEvent.changeText(screen.getByLabelText('events.create.gigTitle'), 'Corrected gig');
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.create.successTitle');
    expect(mutationMock).toHaveBeenLastCalledWith(
      '/events/native',
      expect.objectContaining({
        body: expect.objectContaining({ title: 'Corrected gig' }),
      }),
    );
    expect(mutationMock.mock.calls[0]?.[1]?.idempotencyKey).not.toEqual(
      mutationMock.mock.calls[1]?.[1]?.idempotencyKey,
    );
  });

  it('keeps an unreadable journal visible for retry instead of a blank composer', async () => {
    mockJournal.set(publicationJournalKey('venue-1'), 'invalid-json');
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('common.retry');
    expect(screen.queryByLabelText('events.create.gigTitle')).toBeNull();
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid JSON', '{invalid-json'],
    [
      'unsupported version',
      JSON.stringify({
        version: 2,
        key: '33a98d45-d21a-42ad-8cf2-bf7382e923f8',
        input: {
          title: 'Saved gig',
          localStartTime: '2027-02-12T20:00',
          timeZone: 'Europe/London',
        },
        posterWanted: false,
      }),
    ],
    ['invalid schema', JSON.stringify({ version: 1, key: 'not-a-valid-key' })],
  ])(
    'allows only a confirmed local discard for %s and then a new publication',
    async (_name, value) => {
      mockJournal.set(publicationJournalKey('venue-1'), value);
      renderWithTheme(<CreateEventScreen />);
      await screen.findByText('events.poster.invalidRecovery');
      expect(screen.getByText('events.poster.invalidRecoveryHelp')).toBeTruthy();
      expect(screen.queryByLabelText('events.create.gigTitle')).toBeNull();
      fireEvent.press(screen.getByText('events.poster.discardRecovery'));
      expect(screen.getByText('events.poster.discardRecoveryConfirmation')).toBeTruthy();
      expect(LargeSecureStore.removeItem).not.toHaveBeenCalled();
      expect(mutationMock).not.toHaveBeenCalled();
      fireEvent.press(screen.getByText('events.poster.confirmDiscardRecovery'));
      await screen.findByLabelText('events.create.gigTitle');
      expect(mockJournal.has(publicationJournalKey('venue-1'))).toBe(false);
      expect(LargeSecureStore.removeItem).toHaveBeenCalledWith(publicationJournalKey('venue-1'));
      expect(mutationMock).not.toHaveBeenCalled();
      fillGig();
      fireEvent.press(screen.getByText('events.create.publish'));
      await screen.findByText('events.create.successTitle');
      expect(mutationMock).toHaveBeenCalledTimes(1);
    },
  );

  it('cancels invalid-journal discard confirmation without deleting or publishing anything', async () => {
    mockJournal.set(publicationJournalKey('venue-1'), 'invalid-json');
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.poster.discardRecovery');
    fireEvent.press(screen.getByText('events.poster.discardRecovery'));
    fireEvent.press(screen.getByText('common.cancel'));
    expect(screen.queryByText('events.poster.confirmDiscardRecovery')).toBeNull();
    expect(screen.getByText('events.poster.discardRecovery')).toBeTruthy();
    expect(mockJournal.get(publicationJournalKey('venue-1'))).toBe('invalid-json');
    expect(LargeSecureStore.removeItem).not.toHaveBeenCalled();
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('surfaces failed local discard in the recovery body and allows a confirmed retry', async () => {
    mockJournal.set(publicationJournalKey('venue-1'), 'invalid-json');
    jest
      .mocked(LargeSecureStore.removeItem)
      .mockRejectedValueOnce(new Error('Cannot remove recovery record'));
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.poster.discardRecovery');
    fireEvent.press(screen.getByText('events.poster.discardRecovery'));
    fireEvent.press(screen.getByText('events.poster.confirmDiscardRecovery'));
    await screen.findByText('Cannot remove recovery record');
    expect(screen.getByText('events.poster.invalidRecovery')).toBeTruthy();
    expect(screen.queryByLabelText('events.create.gigTitle')).toBeNull();
    expect(mockJournal.get(publicationJournalKey('venue-1'))).toBe('invalid-json');
    expect(mutationMock).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('events.poster.confirmDiscardRecovery'));
    await screen.findByLabelText('events.create.gigTitle');
    expect(screen.queryByText('Cannot remove recovery record')).toBeNull();
  });

  it('does not offer destructive discard for a SecureStore I/O failure', async () => {
    jest.mocked(LargeSecureStore.getItem).mockRejectedValueOnce(new Error('SecureStore locked'));
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('SecureStore locked');
    expect(screen.queryByText('events.poster.discardRecovery')).toBeNull();
    expect(screen.queryByText('events.poster.confirmDiscardRecovery')).toBeNull();
    expect(LargeSecureStore.removeItem).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('common.retry'));
    await screen.findByLabelText('events.create.gigTitle');
  });

  it('requires a complete durable journal rather than silently accepting missing chunks', async () => {
    await showForm();
    expect(LargeSecureStore.getItem).toHaveBeenCalledWith(publicationJournalKey('venue-1'), {
      requireComplete: true,
    });
  });

  it('offers confirmed local discard only for the typed incomplete-record error', async () => {
    jest.mocked(LargeSecureStore.getItem).mockRejectedValueOnce(new IncompleteStoredValueError());
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.poster.invalidRecovery');
    expect(screen.queryByLabelText('events.create.gigTitle')).toBeNull();
    expect(LargeSecureStore.removeItem).not.toHaveBeenCalled();
    expect(mutationMock).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('events.poster.discardRecovery'));
    fireEvent.press(screen.getByText('events.poster.confirmDiscardRecovery'));
    await screen.findByLabelText('events.create.gigTitle');
    expect(LargeSecureStore.removeItem).toHaveBeenCalledWith(publicationJournalKey('venue-1'));
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('keeps a valid ambiguous journal immutable instead of offering discard', async () => {
    const value = JSON.stringify({
      version: 1,
      key: '33a98d45-d21a-42ad-8cf2-bf7382e923f8',
      input: { title: 'Saved gig', localStartTime: '2027-02-12T20:00', timeZone: 'Europe/London' },
      posterWanted: false,
    });
    mockJournal.set(publicationJournalKey('venue-1'), value);
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.poster.pendingTitle');
    expect(screen.queryByText('events.poster.discardRecovery')).toBeNull();
    expect(screen.queryByLabelText('events.create.gigTitle')).toBeNull();
    expect(mockJournal.get(publicationJournalKey('venue-1'))).toBe(value);
    expect(LargeSecureStore.removeItem).not.toHaveBeenCalled();
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('opens venue Home to check for a published gig without discarding the invalid journal', async () => {
    mockJournal.set(publicationJournalKey('venue-1'), 'invalid-json');
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.poster.checkVenueHome');
    fireEvent.press(screen.getByText('events.poster.checkVenueHome'));
    expect(router.replace).toHaveBeenCalledWith('/(tabs)');
    expect(mockJournal.get(publicationJournalKey('venue-1'))).toBe('invalid-json');
    expect(LargeSecureStore.removeItem).not.toHaveBeenCalled();
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('surfaces capability errors but still allows poster-free gig creation', async () => {
    mockConfig.mockReturnValue({
      isError: true,
      error: new Error('Poster configuration unavailable'),
      refetch: jest.fn(),
    });
    await showForm();
    expect(screen.getByText('Poster configuration unavailable')).toBeTruthy();
    expect(screen.getByText('events.poster.retryConfig')).toBeTruthy();
    fillGig();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.create.successTitle');
  });
});
