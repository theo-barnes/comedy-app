import * as SecureStore from 'expo-secure-store';

import { LargeSecureStore } from '@/lib/large-secure-store';

const mockGet = SecureStore.getItemAsync as jest.Mock;
const mockSet = SecureStore.setItemAsync as jest.Mock;
const mockDelete = SecureStore.deleteItemAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LargeSecureStore.getItem', () => {
  it('reads directly when no .chunks key exists', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'session.chunks') return Promise.resolve(null);
      if (key === 'session') return Promise.resolve('stored-value');
      return Promise.resolve(null);
    });

    const result = await LargeSecureStore.getItem('session');
    expect(result).toBe('stored-value');
  });

  it('assembles chunks when .chunks key exists', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'session.chunks') return Promise.resolve('3');
      if (key === 'session.0') return Promise.resolve('aaa');
      if (key === 'session.1') return Promise.resolve('bbb');
      if (key === 'session.2') return Promise.resolve('ccc');
      return Promise.resolve(null);
    });

    const result = await LargeSecureStore.getItem('session');
    expect(result).toBe('aaabbbccc');
  });

  it('returns null when any chunk is missing', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'session.chunks') return Promise.resolve('2');
      if (key === 'session.0') return Promise.resolve('aaa');
      if (key === 'session.1') return Promise.resolve(null); // missing
      return Promise.resolve(null);
    });

    const result = await LargeSecureStore.getItem('session');
    expect(result).toBeNull();
  });
});

describe('LargeSecureStore.setItem', () => {
  it('writes a single key when value is within chunk size limit', async () => {
    mockDelete.mockResolvedValue(undefined);
    mockSet.mockResolvedValue(undefined);

    const shortValue = 'a'.repeat(100);
    await LargeSecureStore.setItem('session', shortValue);

    expect(mockDelete).toHaveBeenCalledWith('session.chunks');
    expect(mockSet).toHaveBeenCalledWith('session', shortValue);
    // Should not have written chunk keys
    expect(mockSet).not.toHaveBeenCalledWith('session.0', expect.any(String));
  });

  it('splits into chunks and writes count key when value exceeds chunk size', async () => {
    mockSet.mockResolvedValue(undefined);
    mockDelete.mockResolvedValue(undefined);

    // 2300 chars → chunk 0: 1800, chunk 1: 500  (exactly 2 chunks)
    const longValue = 'x'.repeat(2300);
    await LargeSecureStore.setItem('session', longValue);

    // Should write chunk keys
    expect(mockSet).toHaveBeenCalledWith('session.0', 'x'.repeat(1800));
    expect(mockSet).toHaveBeenCalledWith('session.1', 'x'.repeat(500));
    // Should write chunk count
    expect(mockSet).toHaveBeenCalledWith('session.chunks', '2');
    // Should delete the base key
    expect(mockDelete).toHaveBeenCalledWith('session');
    // Should NOT write base key directly
    expect(mockSet).not.toHaveBeenCalledWith('session', longValue);
  });
});

describe('LargeSecureStore.removeItem', () => {
  it('deletes each chunk key when value was chunked', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'session.chunks') return Promise.resolve('3');
      return Promise.resolve(null);
    });
    mockDelete.mockResolvedValue(undefined);

    await LargeSecureStore.removeItem('session');

    expect(mockDelete).toHaveBeenCalledWith('session.0');
    expect(mockDelete).toHaveBeenCalledWith('session.1');
    expect(mockDelete).toHaveBeenCalledWith('session.2');
    expect(mockDelete).toHaveBeenCalledWith('session.chunks');
    expect(mockDelete).not.toHaveBeenCalledWith('session');
  });

  it('deletes the single key when value was not chunked', async () => {
    mockGet.mockImplementation((key: string) => {
      if (key === 'session.chunks') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    mockDelete.mockResolvedValue(undefined);

    await LargeSecureStore.removeItem('session');

    expect(mockDelete).toHaveBeenCalledWith('session');
    expect(mockDelete).not.toHaveBeenCalledWith('session.0');
  });
});
