import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { geocodeAsync } from 'expo-location';
import { router } from 'expo-router';

import { CreateEventScreen } from '@/features/events/CreateEventScreen';
import CreateEventRoute from '../../../app/create-event';
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
const mockParams = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams(),
}));
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
  publicationStatus: 'published',
  posterUrl: 'https://posters.test/ready.jpg',
  posterRevision: 1,
  posterWidth: 100,
  posterHeight: 200,
  comedianIds: [],
};
const draft = {
  ...published,
  publicationStatus: 'draft',
  posterUrl: null,
  posterRevision: 0,
  posterWidth: null,
  posterHeight: null,
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

async function choosePhoto() {
  fireEvent.press(screen.getByText('events.poster.choose'));
  await screen.findByLabelText('events.poster.selectedPreview');
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
    mockParams.mockReturnValue({});
    enablePosters();
    mockRecoveryEvent.mockReturnValue({ data: undefined, isPending: false, error: null });
    mockUpload.mockReset().mockResolvedValue(published);
    mockFetchEvent.mockReset().mockResolvedValue(draft);
    mockPickPoster.mockReset().mockResolvedValue(selection);
    jest.mocked(isApiConfigured).mockReturnValue(true);
    mockAuth.mockReturnValue({
      profile: { id: 'venue-1', role: 'venue', display_name: 'Venue account' },
      isLoading: false,
      isGuest: false,
    });
    fetchMock.mockResolvedValue(venue);
    mutationMock.mockResolvedValue(draft);
  });

  it('publishes once with the explicit venue timezone and no client ownership/location', async () => {
    await showForm();
    fillGig();
    await choosePhoto();
    const button = screen.getByText('events.create.publish');
    act(() => {
      fireEvent.press(button);
      fireEvent.press(button);
    });
    await screen.findByText('events.create.successTitle');
    expect(mutationMock).toHaveBeenCalledTimes(1);
    expect(mutationMock).toHaveBeenCalledWith(
      '/events/native/drafts',
      expect.objectContaining({
        body: {
          title: 'Friday comedy',
          localStartTime: '2027-02-12T20:00',
          timeZone: 'Europe/London',
        },
      }),
    );
    expect(mockUpload).toHaveBeenCalledWith(draft, selection);
    expect(screen.queryByText('events.create.publish')).toBeNull();
  });

  it('keeps form values and surfaces publication failure for retry', async () => {
    mutationMock.mockRejectedValueOnce(new ApiError('Start must be in the future', 422));
    await showForm();
    fillGig();
    await choosePhoto();
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
    await choosePhoto();
    fireEvent.changeText(screen.getByLabelText('events.create.end'), '23:00');
    fireEvent.press(screen.getByText('events.create.publish'));
    expect(screen.getByText('events.create.validation.endPair')).toBeTruthy();
    expect(mutationMock).not.toHaveBeenCalled();
  });

  it('requires a selected image before issuing any preparation or upload request', async () => {
    await showForm();
    fillGig();
    expect(screen.getByText('events.poster.choose')).toBeTruthy();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.poster.imageRequired');
    expect(mutationMock).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(LargeSecureStore.setItem).not.toHaveBeenCalled();
    expect(screen.queryByText('events.create.successTitle')).toBeNull();
  });

  it.each([
    { draftId: [] },
    { draftId: ['draft-1', 'draft-2'] },
    { draftId: '' },
    { draftId: '  ' },
  ])(
    'rejects an invalid draft route without creating or overwriting a preparation: %j',
    async (params) => {
      mockParams.mockReturnValue(params);
      renderWithTheme(<CreateEventRoute />);
      await screen.findByText('events.poster.missingEvent');
      expect(screen.queryByLabelText('events.create.gigTitle')).toBeNull();
      expect(mutationMock).not.toHaveBeenCalled();
      expect(mockUpload).not.toHaveBeenCalled();
      expect(LargeSecureStore.setItem).not.toHaveBeenCalled();
      expect(LargeSecureStore.removeItem).not.toHaveBeenCalled();
    },
  );

  it('passes a single draft ID from the route to owner preparation recovery', async () => {
    mockParams.mockReturnValue({ draftId: draft.id });
    mockRecoveryEvent.mockImplementation((id) => ({
      data: id ? draft : undefined,
      isPending: false,
      error: null,
    }));
    renderWithTheme(<CreateEventRoute />);
    await screen.findByText('events.poster.privatePreparation');
    expect(mockRecoveryEvent).toHaveBeenCalledWith(draft.id, true);
    expect(mutationMock).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
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

  it('refreshes the real owner Home query when the form creates a private preparation', async () => {
    let saved = false;
    fetchMock.mockImplementation(async (path) =>
      path === '/creators/me' ? venue : { items: saved ? [draft] : [] },
    );
    mutationMock.mockImplementation(async () => {
      saved = true;
      return draft;
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
    await choosePhoto();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.create.successTitle');
    await waitFor(() => expect(screen.getAllByText('Friday comedy')).toHaveLength(2));
    expect(screen.queryByText('venues.noEvents')).toBeNull();
    expect(screen.getByText('events.poster.needsImage')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/venues/me/events', { schema: expect.anything() });
  });

  it('offers private owner drafts a needs-image completion action for the same ID', async () => {
    fetchMock.mockResolvedValue({ items: [draft] });
    renderWithTheme(<VenueHome />);
    await screen.findByText('events.poster.needsImage');
    fireEvent.press(screen.getByText('events.poster.completeGig'));
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/create-event',
      params: { draftId: draft.id },
    });
    expect(screen.queryByText('events.poster.manage')).toBeNull();
    expect(mutationMock).not.toHaveBeenCalled();
  });

  function enablePosters() {
    mockConfig.mockReturnValue({
      data: {
        maxBytes: 10 * 1024 * 1024,
        maxPixels: 25_000_000,
        supportedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
      },
      isError: false,
    });
    mockPickPoster.mockResolvedValue(selection);
  }

  it('prepares privately and reports public success only after selected image finalization', async () => {
    enablePosters();
    let finalize!: (value: typeof published) => void;
    mockUpload.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finalize = resolve;
        }),
    );
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.poster.choose'));
    await screen.findByLabelText('events.poster.selectedPreview');
    fireEvent.press(screen.getByText('events.create.publish'));
    await waitFor(() => expect(mockUpload).toHaveBeenCalledWith(draft, selection));
    expect(mutationMock).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('events.create.successTitle')).toBeNull();
    expect(screen.getByText('events.poster.privatePreparation')).toBeTruthy();
    await act(async () => finalize(published));
    await screen.findByText('events.create.successTitle');
    await waitFor(() => expect(screen.queryByText('events.poster.retryUpload')).toBeNull());
    expect(JSON.parse(mockJournal.get(publicationJournalKey('venue-1'))!).eventId).toBe('event-1');
    expect(JSON.parse(mockJournal.get(publicationJournalKey('venue-1'))!).version).toBe(2);
    expect(JSON.parse(mockJournal.get(publicationJournalKey('venue-1'))!).creationInput).toEqual(
      mutationMock.mock.calls[0]?.[1]?.body,
    );
  });

  it('retains a private draft after interrupted upload and retries without duplicate creation', async () => {
    enablePosters();
    mockUpload
      .mockRejectedValueOnce(new Error('Upload interrupted'))
      .mockResolvedValueOnce({ ...published, posterUrl: 'https://posters.test/ready.jpg' });
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.poster.choose'));
    await screen.findByLabelText('events.poster.selectedPreview');
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.poster.privatePreparation');
    expect(screen.queryByText('events.create.successTitle')).toBeNull();
    expect(screen.queryByText('events.poster.partialSuccess')).toBeNull();
    expect(screen.getByText('Upload interrupted')).toBeTruthy();
    fireEvent.press(screen.getByText('events.create.publish'));
    await waitFor(() => expect(mockUpload).toHaveBeenCalledTimes(2));
    await screen.findByText('events.create.successTitle');
    expect(
      mutationMock.mock.calls.filter(([path]) => path === '/events/native/drafts'),
    ).toHaveLength(1);
    expect(mutationMock).toHaveBeenLastCalledWith(
      '/events/event-1/draft',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.objectContaining({ expectedRevision: 0 }),
      }),
    );
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
    mockFetchEvent.mockResolvedValueOnce({ ...draft, posterRevision: 4 });
    mutationMock
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce({ ...draft, posterRevision: 5 });
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.poster.choose'));
    await screen.findByLabelText('events.poster.selectedPreview');
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('Attachment conflicted');
    await waitFor(() => expect(mockFetchEvent).toHaveBeenCalledWith('event-1'));
    await act(async () => {});
    expect(mockUpload).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('events.create.publish'));
    await waitFor(() =>
      expect(mockUpload).toHaveBeenLastCalledWith(
        expect.objectContaining({ id: 'event-1', posterRevision: 5 }),
        selection,
      ),
    );
    expect(mutationMock).toHaveBeenLastCalledWith(
      '/events/event-1/draft',
      expect.objectContaining({
        method: 'PATCH',
        body: expect.objectContaining({ expectedRevision: 4 }),
      }),
    );
    expect(
      mutationMock.mock.calls.filter(([path]) => path === '/events/native/drafts'),
    ).toHaveLength(1);
  });

  it('surfaces reconciliation failure separately and refreshes before permitting an attachment retry', async () => {
    enablePosters();
    mockUpload.mockRejectedValueOnce(new Error('Attachment response lost'));
    mockFetchEvent
      .mockRejectedValueOnce(new Error('Refresh offline'))
      .mockResolvedValueOnce({ ...draft, posterRevision: 4 });
    await showForm();
    fillGig();
    fireEvent.press(screen.getByText('events.poster.choose'));
    await screen.findByLabelText('events.poster.selectedPreview');
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('Refresh offline');
    expect(screen.getByText('Attachment response lost')).toBeTruthy();
    expect(screen.queryByText('events.create.successTitle')).toBeNull();
    fireEvent.press(screen.getByText('events.create.publish'));
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
    expect(screen.queryByText('Attachment response lost')).toBeNull();
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
    await choosePhoto();
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

  it('recovers a legacy private draft without automatically creating or publishing', async () => {
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
      data: id ? draft : undefined,
      isPending: false,
      error: null,
    }));
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.poster.privatePreparation');
    expect(screen.queryByText('events.create.successTitle')).toBeNull();
    expect(screen.getByText('events.poster.choose')).toBeTruthy();
    expect(screen.getByLabelText('events.create.gigTitle').props.value).toBe(published.title);
    expect(mutationMock).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('completes a routed draft using the same ID and fresh CAS revision, not another create', async () => {
    const recovered = { ...draft, posterRevision: 4 };
    mockRecoveryEvent.mockImplementation((id) => ({
      data: id ? recovered : undefined,
      isPending: false,
      error: null,
    }));
    mutationMock.mockResolvedValue({ ...recovered, posterRevision: 5 });
    mockUpload.mockResolvedValue({ ...published, posterRevision: 6 });
    renderWithTheme(<CreateEventScreen draftId={draft.id} />);
    await screen.findByText('events.poster.privatePreparation');
    expect(screen.getByLabelText('events.create.gigTitle').props.value).toBe(draft.title);
    fillGig();
    await choosePhoto();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.create.successTitle');
    expect(mutationMock).toHaveBeenCalledTimes(1);
    expect(mutationMock).toHaveBeenCalledWith(
      '/events/event-1/draft',
      expect.objectContaining({
        method: 'PATCH',
        body: {
          title: 'Friday comedy',
          localStartTime: '2027-02-12T20:00',
          timeZone: 'UTC',
          expectedRevision: 4,
        },
      }),
    );
    expect(mockUpload).toHaveBeenCalledWith(
      expect.objectContaining({ id: draft.id, publicationStatus: 'draft', posterRevision: 5 }),
      selection,
    );
  });

  it('retries the route-only draft fetch after initial failure without replaying preparation', async () => {
    const refetch = jest.fn(async () => {
      mockRecoveryEvent.mockReturnValue({
        data: draft,
        isPending: false,
        error: null,
        refetch,
      });
      return { data: draft, isError: false };
    });
    mockRecoveryEvent.mockReturnValue({
      data: undefined,
      isPending: false,
      error: new Error('Draft fetch offline'),
      refetch,
    });
    const view = renderWithTheme(<CreateEventScreen draftId={draft.id} />);
    await screen.findByText('Draft fetch offline');
    fireEvent.press(screen.getByText('common.retry'));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    view.rerender(<CreateEventScreen draftId={draft.id} />);
    await screen.findByText('events.poster.privatePreparation');
    expect(screen.getByLabelText('events.create.gigTitle').props.value).toBe(draft.title);
    expect(mutationMock).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(LargeSecureStore.setItem).not.toHaveBeenCalled();
  });

  it('removes the routed draft ID after successful completion before creating another gig', async () => {
    mockRecoveryEvent.mockImplementation((id) => ({
      data: id ? draft : undefined,
      isPending: false,
      error: null,
    }));
    renderWithTheme(<CreateEventScreen draftId={draft.id} />);
    await screen.findByText('events.poster.privatePreparation');
    await choosePhoto();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.create.successTitle');
    expect(mockJournal.has(publicationJournalKey('venue-1'))).toBe(true);
    fireEvent.press(screen.getByText('events.poster.createAnother'));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/create-event'));
    expect(LargeSecureStore.removeItem).toHaveBeenCalledWith(publicationJournalKey('venue-1'));
    expect(mockJournal.has(publicationJournalKey('venue-1'))).toBe(false);
    expect(mutationMock).toHaveBeenCalledTimes(1);
    expect(mutationMock).toHaveBeenCalledWith('/events/event-1/draft', expect.anything());
    expect(mockUpload).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 'different-draft'])(
    'does not overwrite a valid pending journal when another draft route is opened: %s',
    async (eventId) => {
      const input = {
        title: 'Saved preparation',
        localStartTime: '2027-02-12T20:00',
        timeZone: 'Europe/London',
      };
      const value = JSON.stringify({
        version: 2,
        key: 'ee9964bd-2d10-4f1a-a009-598a4a055a39',
        input,
        creationInput: input,
        ...(eventId ? { eventId } : {}),
      });
      mockJournal.set(publicationJournalKey('venue-1'), value);
      mockRecoveryEvent.mockImplementation((id) => ({
        data: id ? { ...draft, id } : undefined,
        isPending: false,
        error: null,
      }));
      renderWithTheme(<CreateEventScreen draftId="routed-draft" />);
      await screen.findByText('events.poster.otherPreparation');
      if (!eventId) expect(mockRecoveryEvent).toHaveBeenLastCalledWith(undefined, false);
      expect(screen.queryByText('events.create.publish')).toBeNull();
      expect(screen.queryByText('events.poster.discardRecovery')).toBeNull();
      fireEvent.press(screen.getByText('events.poster.resumePreparation'));
      expect(router.replace).toHaveBeenCalledWith('/create-event');
      expect(mockJournal.get(publicationJournalKey('venue-1'))).toBe(value);
      expect(LargeSecureStore.setItem).not.toHaveBeenCalled();
      expect(LargeSecureStore.removeItem).not.toHaveBeenCalled();
      expect(mutationMock).not.toHaveBeenCalled();
      expect(mockUpload).not.toHaveBeenCalled();
      expect(screen.queryByText('events.create.successTitle')).toBeNull();
    },
  );

  it('keeps the original legacy creation payload and key immutable when correcting a recovered draft', async () => {
    const key = 'ee9964bd-2d10-4f1a-a009-598a4a055a39';
    const original = {
      title: 'Original gig',
      localStartTime: '2027-02-12T20:00',
      timeZone: 'Europe/London',
    };
    mockJournal.set(
      publicationJournalKey('venue-1'),
      JSON.stringify({
        version: 1,
        key,
        input: original,
        eventId: draft.id,
        posterWanted: false,
      }),
    );
    mockRecoveryEvent.mockImplementation((id) => ({
      data: id ? draft : undefined,
      isPending: false,
      error: null,
    }));
    mockUpload.mockRejectedValueOnce(new Error('Upload interrupted'));
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.poster.privatePreparation');
    fireEvent.changeText(screen.getByLabelText('events.create.gigTitle'), 'Corrected gig');
    await choosePhoto();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('Upload interrupted');
    const record = JSON.parse(mockJournal.get(publicationJournalKey('venue-1'))!);
    expect(record).toMatchObject({
      version: 2,
      key,
      creationInput: original,
      eventId: draft.id,
      input: { ...original, title: 'Corrected gig' },
    });
    expect(mutationMock).toHaveBeenCalledWith(
      '/events/event-1/draft',
      expect.objectContaining({
        method: 'PATCH',
        body: { ...original, title: 'Corrected gig', expectedRevision: 0 },
      }),
    );
    expect(mutationMock).not.toHaveBeenCalledWith('/events/native/drafts', expect.anything());
    expect(screen.queryByText('events.create.successTitle')).toBeNull();
  });

  it('recovers a v2 ambiguous preparation by replaying creationInput rather than edited input', async () => {
    const key = 'ee9964bd-2d10-4f1a-a009-598a4a055a39';
    const creationInput = {
      title: 'Original gig',
      localStartTime: '2027-02-12T20:00',
      timeZone: 'Europe/London',
    };
    mockJournal.set(
      publicationJournalKey('venue-1'),
      JSON.stringify({
        version: 2,
        key,
        creationInput,
        input: { ...creationInput, title: 'Edited later' },
      }),
    );
    renderWithTheme(<CreateEventScreen />);
    await screen.findByText('events.poster.pendingTitle');
    expect(mutationMock).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('events.poster.retryPublication'));
    await screen.findByText('events.poster.imageRequired');
    expect(mutationMock).not.toHaveBeenCalled();
    await choosePhoto();
    fireEvent.press(screen.getByText('events.poster.retryPublication'));
    await screen.findByText('events.create.successTitle');
    expect(mutationMock).toHaveBeenCalledWith(
      '/events/native/drafts',
      expect.objectContaining({
        body: creationInput,
        idempotencyKey: key,
      }),
    );
  });

  it('does not clear another account journal or expose its publication after switching', async () => {
    const view = renderWithTheme(<CreateEventScreen />);
    await screen.findByLabelText('events.create.gigTitle');
    fillGig();
    await choosePhoto();
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
    await choosePhoto();
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
    await choosePhoto();
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
    await choosePhoto();
    fireEvent.press(screen.getByText('events.poster.retryPublication'));
    await screen.findByText('events.create.successTitle');
    expect(mutationMock).toHaveBeenCalledWith(
      '/events/native/drafts',
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
    await choosePhoto();
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('Invalid title');
    expect(mockJournal.has(publicationJournalKey('venue-1'))).toBe(false);
    fireEvent.changeText(screen.getByLabelText('events.create.gigTitle'), 'Corrected gig');
    fireEvent.press(screen.getByText('events.create.publish'));
    await screen.findByText('events.create.successTitle');
    expect(mutationMock).toHaveBeenLastCalledWith(
      '/events/native/drafts',
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
        version: 3,
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
      await choosePhoto();
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

  it('surfaces config errors with the required picker visible and blocks publication even with a selection', async () => {
    mockConfig.mockReturnValue({
      isError: true,
      error: new Error('Poster configuration unavailable'),
      refetch: jest.fn(),
    });
    await showForm();
    expect(screen.getByText('Poster configuration unavailable')).toBeTruthy();
    expect(screen.getByText('events.poster.retryConfig')).toBeTruthy();
    fillGig();
    await choosePhoto();
    fireEvent.press(screen.getByText('events.create.publish'));
    await act(async () => {});
    expect(screen.queryByText('events.create.successTitle')).toBeNull();
    expect(screen.getByLabelText('events.poster.selectedPreview')).toBeTruthy();
    expect(mutationMock).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(LargeSecureStore.setItem).not.toHaveBeenCalled();
  });

  it('keeps the required picker visible while configuration is absent and issues no requests', async () => {
    mockConfig.mockReturnValue({ data: undefined, isPending: true, isError: false });
    await showForm();
    fillGig();
    await choosePhoto();
    expect(mockPickPoster).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByText('events.create.publish'));
    await act(async () => {});
    expect(mutationMock).not.toHaveBeenCalled();
    expect(mockUpload).not.toHaveBeenCalled();
    expect(LargeSecureStore.setItem).not.toHaveBeenCalled();
    expect(screen.queryByText('events.create.successTitle')).toBeNull();
  });
});
