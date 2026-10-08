import * as SecureStore from 'expo-secure-store';

import { IncompleteStoredValueError, LargeSecureStore } from '@/lib/large-secure-store';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const values = new Map<string, string>();

describe('large secure storage integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    values.clear();
    jest
      .mocked(SecureStore.getItemAsync)
      .mockImplementation(async (key) => values.get(key) ?? null);
    jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key, value) => {
      expect(Buffer.byteLength(value, 'utf8')).toBeLessThanOrEqual(1800);
      // Model the native UTF-8 bridge rather than preserving invalid UTF-16 in a JS mock.
      values.set(key, Buffer.from(value, 'utf8').toString('utf8'));
    });
    jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key) => {
      values.delete(key);
    });
  });

  it.each([
    ['empty text', ''],
    ['short ASCII', 'a'.repeat(1800)],
    ['long ASCII', 'a'.repeat(3601)],
    ['a boundary emoji', 'a'.repeat(1799) + '\u{1f600}' + 'b'.repeat(100)],
    ['multibyte text', '\u754c'.repeat(1500)],
    [
      'a Unicode journal',
      JSON.stringify({ title: '\u{1f600}'.repeat(200), description: '\u754c'.repeat(2000) }),
    ],
  ])(
    'round-trips %s within native byte limits without splitting code points',
    async (_label, value) => {
      await LargeSecureStore.setItem('journal', value);
      await expect(LargeSecureStore.getItem('journal', { requireComplete: true })).resolves.toBe(
        value,
      );
    },
  );

  it('preserves old callers while strict journal reads reject missing chunks', async () => {
    values.set('journal.chunks', '2');
    values.set('journal.0', 'first');
    await expect(LargeSecureStore.getItem('journal')).resolves.toBeNull();
    await expect(
      LargeSecureStore.getItem('journal', { requireComplete: true }),
    ).rejects.toBeInstanceOf(IncompleteStoredValueError);
  });

  it.each(['0', '-1', '2broken', '100000000', 'NaN'])(
    'rejects invalid strict manifest %s',
    async (count) => {
      values.set('journal.chunks', count);
      await expect(
        LargeSecureStore.getItem('journal', { requireComplete: true }),
      ).rejects.toBeInstanceOf(IncompleteStoredValueError);
    },
  );

  it('does not classify a secure-store I/O error as a discardable record', async () => {
    const error = new Error('Native secure storage is unavailable');
    jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(error);
    await expect(LargeSecureStore.getItem('journal', { requireComplete: true })).rejects.toBe(
      error,
    );
  });

  it('keeps short legacy values readable and clears all chunks explicitly', async () => {
    values.set('journal', 'legacy');
    await expect(LargeSecureStore.getItem('journal', { requireComplete: true })).resolves.toBe(
      'legacy',
    );
    await LargeSecureStore.setItem('journal', 'a'.repeat(4000));
    expect(values.has('journal')).toBe(false);
    await LargeSecureStore.removeItem('journal');
    expect(values.size).toBe(0);
  });
});
