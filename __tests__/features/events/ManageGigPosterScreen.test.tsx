import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { ManageGigPosterScreen } from '@/features/events/ManageGigPosterScreen';
import ManageGigPosterRoute from '../../../app/manage-gig-poster';
import { ApiError } from '@/lib/api/client';
import { renderWithTheme } from '../../utils/renderWithTheme';

const mockAuth = jest.fn();
const mockEventQuery = jest.fn();
const mockConfig = jest.fn();
const mockRemove = jest.fn();
const mockUpload = jest.fn();
const mockRefetch = jest.fn();
const mockPickPoster = jest.fn();
const mockParams = jest.fn();
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: () => mockParams(),
}));
jest.mock('@/features/auth/useAuth', () => ({ useAuth: () => mockAuth() }));
jest.mock('@/lib/api/client', () => ({
  ...jest.requireActual('@/lib/api/client'),
  isApiConfigured: () => true,
}));
jest.mock('@/lib/api/gig-posters', () => ({
  useEvent: (...args: unknown[]) => mockEventQuery(...args),
  usePosterConfig: () => mockConfig(),
  useRemoveGigPoster: () => ({ mutateAsync: mockRemove, isPending: false }),
}));
jest.mock('@/features/events/poster-picker', () => ({ pickPoster: () => mockPickPoster() }));
jest.mock('@/features/events/poster-upload', () => ({
  useGigPosterUpload: () => ({
    upload: mockUpload,
    status: 'idle',
    isPending: false,
    progress: 0,
    cancel: jest.fn(),
    error: null,
  }),
}));
const event = {
  id: 'gig-1',
  venueId: 'venue-1',
  title: 'Friday show',
  posterUrl: 'https://posters.test/old.jpg',
  posterRevision: 3,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockReturnValue({ profile: { id: 'venue-1', role: 'venue' }, isLoading: false });
  mockEventQuery.mockReturnValue({
    data: event,
    isPending: false,
    isError: false,
    refetch: mockRefetch,
  });
  mockRefetch.mockResolvedValue({ data: event, isError: false });
  mockConfig.mockReturnValue({
    data: {
      enabled: true,
      maxBytes: 10_485_760,
      maxPixels: 25_000_000,
      supportedContentTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
    isPending: false,
    isError: false,
  });
  mockPickPoster.mockResolvedValue({
    uri: 'file:///new.jpg',
    contentType: 'image/jpeg',
    width: 20,
    height: 20,
    fileSize: 100,
  });
  mockParams.mockReturnValue({});
});

it('guards missing gig, roles and ownership without showing private write controls', () => {
  const view = renderWithTheme(<ManageGigPosterScreen eventId={undefined} />);
  expect(screen.getByText('events.poster.missingEvent')).toBeTruthy();
  view.unmount();
  mockEventQuery.mockReturnValue({ data: { ...event, venueId: 'someone-else' } });
  renderWithTheme(<ManageGigPosterScreen eventId="gig-1" />);
  expect(screen.getByText('events.poster.notOwner')).toBeTruthy();
  expect(screen.queryByText('events.poster.choose')).toBeNull();
  expect(screen.queryByLabelText('events.poster.currentPreview')).toBeNull();
});

it('keeps current artwork visible when writes are disabled', () => {
  mockConfig.mockReturnValue({ data: { enabled: false }, isPending: false });
  renderWithTheme(<ManageGigPosterScreen eventId="gig-1" />);
  expect(screen.getByLabelText('events.poster.currentPreview').props.source.uri).toBe(
    event.posterUrl,
  );
  expect(screen.getByText('events.poster.disabled')).toBeTruthy();
  expect(screen.queryByText('events.poster.remove')).toBeNull();
});

it('confirms removal and retains the previous image on failure', async () => {
  mockRemove.mockRejectedValueOnce(new Error('Removal failed'));
  renderWithTheme(<ManageGigPosterScreen eventId="gig-1" />);
  fireEvent.press(screen.getByText('events.poster.remove'));
  expect(mockRemove).not.toHaveBeenCalled();
  fireEvent.press(screen.getByText('events.poster.confirmRemove'));
  await screen.findByText('Removal failed');
  expect(screen.getByLabelText('events.poster.currentPreview').props.source.uri).toBe(
    event.posterUrl,
  );
  expect(mockRemove).toHaveBeenCalledWith({ eventId: 'gig-1', expectedRevision: 3 });
});

it('refreshes a conflict and uses the fresh revision only on an explicit retry', async () => {
  mockRemove
    .mockRejectedValueOnce(new ApiError('Poster changed elsewhere', 409))
    .mockResolvedValueOnce({ ...event, posterUrl: null, posterRevision: 5 });
  mockRefetch.mockImplementation(async () => {
    mockEventQuery.mockReturnValue({
      data: { ...event, posterRevision: 4 },
      isPending: false,
      isError: false,
      refetch: mockRefetch,
    });
    return { data: { ...event, posterRevision: 4 }, isError: false };
  });
  renderWithTheme(<ManageGigPosterScreen eventId="gig-1" />);
  fireEvent.press(screen.getByText('events.poster.remove'));
  fireEvent.press(screen.getByText('events.poster.confirmRemove'));
  await screen.findByText('Poster changed elsewhere');
  await waitFor(() => expect(mockRefetch).toHaveBeenCalledTimes(1));
  expect(mockRemove).toHaveBeenCalledTimes(1);
  await act(async () => {});
  fireEvent.press(screen.getByText('events.poster.confirmRemove'));
  await waitFor(() =>
    expect(mockRemove).toHaveBeenLastCalledWith({ eventId: 'gig-1', expectedRevision: 4 }),
  );
});

it('keeps old poster visible through replacement preview and upload failure', async () => {
  mockUpload.mockRejectedValueOnce(new Error('Upload failed'));
  renderWithTheme(<ManageGigPosterScreen eventId="gig-1" />);
  fireEvent.press(screen.getByText('events.poster.choose'));
  await screen.findByLabelText('events.poster.selectedPreview');
  expect(screen.getByLabelText('events.poster.currentPreview').props.source.uri).toBe(
    event.posterUrl,
  );
  fireEvent.press(screen.getByText('events.poster.replace'));
  await screen.findByText('Upload failed');
  expect(screen.getByLabelText('events.poster.currentPreview').props.source.uri).toBe(
    event.posterUrl,
  );
});

it('retains known current artwork when a reconciliation refetch fails', () => {
  mockEventQuery.mockReturnValue({
    data: event,
    isPending: false,
    isError: true,
    error: new Error('Refresh offline'),
    refetch: mockRefetch,
  });
  renderWithTheme(<ManageGigPosterScreen eventId="gig-1" />);
  expect(screen.getByText('Refresh offline')).toBeTruthy();
  expect(screen.getByLabelText('events.poster.currentPreview').props.source.uri).toBe(
    event.posterUrl,
  );
  expect(screen.getByText('common.retry')).toBeTruthy();
});

it('shows an actionable fallback when current artwork cannot load', () => {
  renderWithTheme(<ManageGigPosterScreen eventId="gig-1" />);
  fireEvent(screen.getByLabelText('events.poster.currentPreview'), 'error');
  expect(screen.getByText('events.poster.imageUnavailable')).toBeTruthy();
  expect(screen.getByText('events.poster.choose')).toBeTruthy();
});

it.each([{}, { eventId: ['gig-1', 'gig-2'] }, { eventId: '' }, { eventId: '  ' }])(
  'guards missing, repeated and blank route parameters: %j',
  (params) => {
    mockParams.mockReturnValue(params);
    renderWithTheme(<ManageGigPosterRoute />);
    expect(screen.getByText('events.poster.missingEvent')).toBeTruthy();
    expect(mockUpload).not.toHaveBeenCalled();
  },
);

it('passes a single eventId from the thin route to the feature', () => {
  mockParams.mockReturnValue({ eventId: 'gig-1' });
  renderWithTheme(<ManageGigPosterRoute />);
  expect(mockEventQuery).toHaveBeenCalledWith('gig-1', true);
  expect(screen.getByLabelText('events.poster.currentPreview')).toBeTruthy();
});

it.each(['fan', 'comedian'])('denies %s accounts before exposing poster controls', (role) => {
  mockAuth.mockReturnValue({ profile: { id: 'venue-1', role }, isLoading: false });
  renderWithTheme(<ManageGigPosterScreen eventId="gig-1" />);
  expect(screen.getByText('events.create.permissionDenied')).toBeTruthy();
  expect(mockEventQuery).toHaveBeenCalledWith('gig-1', false);
  expect(screen.queryByLabelText('events.poster.currentPreview')).toBeNull();
});
