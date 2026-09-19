import { Upload } from 'tus-js-client';

type TusUploadOptions = {
  uri: string;
  sizeBytes: number;
  mimeType: string;
  uploadUrl: string;
  headers: Record<string, string>;
  onProgress: (progress: number) => void;
};

export type VideoUploadController = {
  start: () => void;
  pause: () => Promise<void>;
  resume: () => void;
  cancel: () => Promise<void>;
  completed: Promise<void>;
};

export function createTusVideoUpload({
  uri,
  sizeBytes,
  mimeType,
  uploadUrl,
  headers,
  onProgress,
}: TusUploadOptions): VideoUploadController {
  let resolveCompleted: () => void;
  let rejectCompleted: (error: Error) => void;
  const completed = new Promise<void>((resolve, reject) => {
    resolveCompleted = resolve;
    rejectCompleted = reject;
  });

  const reactNativeSource = { uri, size: sizeBytes, type: mimeType } as unknown as File;
  const upload = new Upload(reactNativeSource, {
    uploadUrl,
    uploadSize: sizeBytes,
    headers,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    chunkSize: 10 * 1024 * 1024,
    removeFingerprintOnSuccess: true,
    onProgress: (sent, total) => onProgress(total > 0 ? sent / total : 0),
    onError: (error) => rejectCompleted(error),
    onSuccess: () => resolveCompleted(),
  });

  return {
    start: () => upload.start(),
    pause: () => upload.abort(false),
    resume: () => upload.start(),
    cancel: async () => {
      await upload.abort(true);
      rejectCompleted(new Error('Upload cancelled.'));
    },
    completed,
  };
}
