import { fetchPublicProfile } from '@/lib/api/public-profiles';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/keys';

jest.mock('@/lib/api/client', () => ({
  apiFetch: jest.fn(),
  isApiConfigured: () => true,
}));

const mockApiFetch = apiFetch as jest.Mock;

describe('public profile API', () => {
  beforeEach(() => {
    mockApiFetch.mockReset();
  });

  it('fetches the allowlisted public profile response for a user', async () => {
    mockApiFetch.mockResolvedValue({ id: 'creator-1', displayName: 'Jo King' });

    await expect(fetchPublicProfile('creator-1')).resolves.toEqual({
      id: 'creator-1',
      displayName: 'Jo King',
    });
    expect(mockApiFetch).toHaveBeenCalledWith('/profiles/creator-1', {
      schema: expect.any(Object),
    });
    expect(queryKeys.publicProfile('creator-1')).toEqual(['public-profile', 'creator-1']);
  });
});
