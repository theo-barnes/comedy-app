import { ApiError, apiFetch, apiMutation } from '@/lib/api/client';
import {
  createNativeEvent,
  creatorProfileSchema,
  eventSchema,
  fetchMyCreatorProfile,
  saveVenueProfile,
} from '@/lib/api/events';

jest.mock('@/lib/api/client', () => ({
  ...jest.requireActual('@/lib/api/client'),
  apiFetch: jest.fn(),
  apiMutation: jest.fn(),
}));

const fetchMock = jest.mocked(apiFetch);
const mutationMock = jest.mocked(apiMutation);

describe('native events API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('only treats a missing creator profile as setup required', async () => {
    fetchMock.mockRejectedValueOnce(new ApiError('Not found', 404));
    await expect(fetchMyCreatorProfile()).resolves.toBeNull();
    fetchMock.mockRejectedValueOnce(new ApiError('Forbidden', 403));
    await expect(fetchMyCreatorProfile()).rejects.toMatchObject({ status: 403 });
  });

  it('sends local times and explicit timezone, never client venue coordinates', async () => {
    const body = {
      title: 'Friday comedy',
      localStartTime: '2027-02-12T20:00',
      timeZone: 'Europe/London',
    };
    await createNativeEvent(body);
    expect(mutationMock).toHaveBeenCalledWith('/events/native', {
      method: 'POST',
      body,
      schema: eventSchema,
    });
  });

  it('preserves profile metadata when saving venue location', async () => {
    const body = {
      name: 'Comedy Cellar',
      genres: [],
      address: '10 High Street',
      latitude: 51.5,
      longitude: -0.1,
      capacity: 120,
      bio: 'A friendly room',
    };
    await saveVenueProfile(body);
    expect(mutationMock).toHaveBeenCalledWith('/creators/me', {
      method: 'PUT',
      body,
      schema: creatorProfileSchema,
    });
  });

  it('parses existing creator responses without newly added coordinates', () => {
    expect(
      creatorProfileSchema.safeParse({
        id: 'venue-1',
        creatorType: 'venue',
        name: 'Comedy Cellar',
        genres: [],
        verified: true,
      }).success,
    ).toBe(true);
  });

  it('validates event timestamps and rejects malformed responses', () => {
    const event = {
      id: 'event-1',
      venueId: 'venue-1',
      title: 'Friday comedy',
      startTime: '2027-02-12T20:00:00+00:00',
      status: 'scheduled',
      comedianIds: [],
    };
    expect(eventSchema.safeParse(event).success).toBe(true);
    expect(eventSchema.safeParse({ ...event, startTime: 'Friday' }).success).toBe(false);
  });
});
