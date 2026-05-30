import * as SecureStore from 'expo-secure-store';

/**
 * expo-secure-store has a 2 KB limit per key. Supabase sessions routinely exceed
 * this, so we chunk large values across multiple keys and reassemble on read.
 */
const CHUNK_SIZE = 1800; // bytes — stay safely under the 2 KB limit

export const LargeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const chunkCountStr = await SecureStore.getItemAsync(`${key}.chunks`);
    if (chunkCountStr == null) return SecureStore.getItemAsync(key);

    const chunkCount = parseInt(chunkCountStr, 10);
    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
    );
    if (chunks.some((c) => c == null)) return null;
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    if (value.length <= CHUNK_SIZE) {
      await SecureStore.deleteItemAsync(`${key}.chunks`);
      return SecureStore.setItemAsync(key, value);
    }

    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
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
