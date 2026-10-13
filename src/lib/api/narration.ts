import { File, Paths } from 'expo-file-system';

import { apiBinaryFetch } from '@/lib/api/client';

export type NarrationResourceType = 'event' | 'creator';

export type NarrationAudioFile = {
  file: File;
  dispose: () => void;
};

/**
 * Retrieves a transient narration response through Cue's authenticated API and writes it to the
 * app cache for native playback. The file is never promoted to persistent storage.
 */
export async function fetchNarrationAudio(
  resourceType: NarrationResourceType,
  resourceId: string,
  signal?: AbortSignal,
): Promise<NarrationAudioFile> {
  const response = await apiBinaryFetch(
    `/accessibility/narration/${resourceType}/${encodeURIComponent(resourceId)}`,
    { contentType: 'audio/mpeg', signal },
  );
  const file = new File(
    Paths.cache,
    `narration-${resourceType}-${resourceId.replace(/[^a-zA-Z0-9_-]/g, '_')}-${Date.now()}.mp3`,
  );
  file.write(new Uint8Array(await response.arrayBuffer()));

  return {
    file,
    dispose: () => {
      if (file.exists) {
        file.delete();
      }
    },
  };
}
