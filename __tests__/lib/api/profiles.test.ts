import { fetchProfile, updateProfileRole } from '@/lib/api/profiles';
import { queryKeys } from '@/lib/api/keys';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

const mockFrom = supabase.from as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('queryKeys', () => {
  it('mints hierarchical profile keys', () => {
    expect(queryKeys.profiles).toEqual(['profile']);
    expect(queryKeys.profile('u1')).toEqual(['profile', 'u1']);
  });
});

describe('fetchProfile', () => {
  function mockSelectChain(result: { data: unknown; error: unknown }) {
    const maybeSingle = jest.fn().mockResolvedValue(result);
    const eq = jest.fn(() => ({ maybeSingle }));
    const select = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });
    return { select, eq, maybeSingle };
  }

  it('returns the profile row', async () => {
    const row = { id: 'u1', display_name: 'Jo', role: 'fan' };
    const { select, eq } = mockSelectChain({ data: row, error: null });

    await expect(fetchProfile('u1')).resolves.toEqual(row);
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });

  it('returns null when no row exists yet', async () => {
    mockSelectChain({ data: null, error: null });
    await expect(fetchProfile('u1')).resolves.toBeNull();
  });

  it('throws when the query errors', async () => {
    mockSelectChain({ data: null, error: new Error('rls denied') });
    await expect(fetchProfile('u1')).rejects.toThrow('rls denied');
  });
});

describe('updateProfileRole', () => {
  it('updates the role scoped to the user id', async () => {
    const eq = jest.fn().mockResolvedValue({ data: null, error: null });
    const update = jest.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });

    await updateProfileRole('u1', 'comedian');

    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(update).toHaveBeenCalledWith({ role: 'comedian' });
    expect(eq).toHaveBeenCalledWith('id', 'u1');
  });
});
