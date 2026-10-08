import * as SecureStore from 'expo-secure-store';

/**
 * expo-secure-store has a 2 KB limit per key. Supabase sessions routinely exceed
 * this, so we chunk large values across multiple keys and reassemble on read.
 */
const CHUNK_SIZE = 1800; // bytes — stay safely under the 2 KB limit

export class IncompleteStoredValueError extends Error {
  constructor() {
    super('The saved value is incomplete or has an invalid chunk manifest.');
    this.name = 'IncompleteStoredValueError';
  }
}

export const LargeSecureStore = {
  async getItem(key: string, options: { requireComplete?: boolean } = {}): Promise<string | null> {
    const chunkCountStr = await SecureStore.getItemAsync(`${key}.chunks`);
    if (chunkCountStr == null) return SecureStore.getItemAsync(key);

    const chunkCount = parseInt(chunkCountStr, 10);
    if (
      options.requireComplete &&
      (!/^[1-9]\d*$/.test(chunkCountStr) || !Number.isSafeInteger(chunkCount) || chunkCount > 1024)
    ) {
      throw new IncompleteStoredValueError();
    }
    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
    );
    if (chunks.some((c) => c == null)) {
      if (options.requireComplete) throw new IncompleteStoredValueError();
      return null;
    }
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const chunks: string[] = [];
    let chunk = '';
    let bytes = 0;
    for (const character of value) {
      const code = character.charCodeAt(0);
      const size = character.length === 2 ? 4 : code <= 0x7f ? 1 : code <= 0x7ff ? 2 : 3;
      if (bytes + size > CHUNK_SIZE) {
        chunks.push(chunk);
        chunk = '';
        bytes = 0;
      }
      chunk += character;
      bytes += size;
    }
    chunks.push(chunk);
    if (chunks.length === 1) {
      await SecureStore.deleteItemAsync(`${key}.chunks`);
      return SecureStore.setItemAsync(key, value);
    }

    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)));
    await SecureStore.setItemAsync(`${key}.chunks`, String(chunks.length));
    await SecureStore.deleteItemAsync(key);
  },

  async removeItem(key: string): Promise<void> {
    const chunkCountStr = await SecureStore.getItemAsync(`${key}.chunks`);
    if (chunkCountStr != null) {
      const chunkCount = parseInt(chunkCountStr, 10);
      await Promise.all(
        Array.from({ length: chunkCount }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)),
      );
      await SecureStore.deleteItemAsync(`${key}.chunks`);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
