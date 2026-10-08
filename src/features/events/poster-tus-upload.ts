import { File } from 'expo-file-system';
import { Upload } from 'tus-js-client';

import type { PosterUploadIntent } from '@/lib/api/gig-posters';

export class PosterUploadCancelled extends Error {
  constructor() {
    super('Poster upload cancelled.');
    this.name = 'PosterUploadCancelled';
  }
}

export type PosterUploadController = {
  start: () => void;
  cancel: () => Promise<void>;
  completed: Promise<void>;
};

export function createTusPosterUpload({
  uri,
  fileSize,
  contentType,
  intent,
  onProgress,
}: {
  uri: string;
  fileSize: number;
  contentType: string;
  intent: PosterUploadIntent;
  onProgress: (progress: number) => void;
}): PosterUploadController {
  const file = new File(uri);
  if (!file.exists || file.size !== fileSize || fileSize <= 0) {
    throw new Error('The selected poster is no longer available. Please select it again.');
  }

  let resolveCompleted: () => void;
  let rejectCompleted: (error: Error) => void;
  const completed = new Promise<void>((resolve, reject) => {
    resolveCompleted = resolve;
    rejectCompleted = reject;
  });
  const upload = new Upload(file, {
    endpoint: intent.uploadUrl,
    uploadSize: fileSize,
    headers: { 'x-signature': intent.uploadToken, 'x-upsert': 'false' },
    metadata: {
      bucketName: intent.bucketName,
      objectName: intent.objectName,
      contentType,
      cacheControl: '3600',
    },
    chunkSize: 6 * 1024 * 1024,
    uploadDataDuringCreation: true,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    storeFingerprintForResuming: false,
    removeFingerprintOnSuccess: true,
    onProgress: (sent, total) => onProgress(total > 0 ? sent / total : 0),
    // Do not expose request objects or signed capabilities from DetailedError.
    onError: () => rejectCompleted(new Error('Poster upload failed. Please try again.')),
    onSuccess: () => resolveCompleted(),
  });

  return {
    start: () => upload.start(),
    cancel: async () => {
      try {
        // Leave interrupted private objects to the server's safe cleanup schedule.
        await upload.abort(false);
      } finally {
        rejectCompleted(new PosterUploadCancelled());
      }
    },
    completed,
  };
}
