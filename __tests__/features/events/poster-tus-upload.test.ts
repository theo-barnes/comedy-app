import { File } from 'expo-file-system';
import { Upload } from 'tus-js-client';

import { createTusPosterUpload } from '@/features/events/poster-tus-upload';

const mockFileState = { exists: true, size: 1000 };
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation((uri: string) => ({ uri, ...mockFileState })),
}));
jest.mock('tus-js-client', () => ({
  Upload: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    abort: jest.fn().mockResolvedValue(undefined),
  })),
}));

const options = {
  uri: 'file:///poster.jpg',
  fileSize: 1000,
  contentType: 'image/jpeg',
  intent: {
    assetId: 'asset-1',
    uploadUrl: 'https://project.storage.supabase.co/storage/v1/upload/resumable/sign',
    uploadToken: 'signed-upload-capability',
    bucketName: 'gig-poster-originals',
    objectName: 'uploads/asset-1',
  },
  onProgress: jest.fn(),
};

function uploadOptions() {
  const call = jest.mocked(Upload).mock.calls[0];
  if (!call) throw new Error('Expected a TUS upload to be constructed');
  return call[1];
}

describe('Supabase poster TUS transport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileState.exists = true;
    mockFileState.size = 1000;
  });

  it('uses a new upload endpoint, 6 MiB chunks and scoped signed metadata', async () => {
    const controller = createTusPosterUpload(options);
    const config = uploadOptions();
    expect(config).toMatchObject({
      endpoint: options.intent.uploadUrl,
      chunkSize: 6 * 1024 * 1024,
      headers: { 'x-signature': options.intent.uploadToken, 'x-upsert': 'false' },
      metadata: {
        bucketName: 'gig-poster-originals',
        objectName: 'uploads/asset-1',
        contentType: 'image/jpeg',
      },
      storeFingerprintForResuming: false,
    });
    expect(config.uploadUrl).toBeUndefined();
    config.onProgress?.(500, 1000);
    expect(options.onProgress).toHaveBeenCalledWith(0.5);
    expect(File).toHaveBeenCalledWith(options.uri);
    config.onSuccess?.({
      lastResponse: {
        getStatus: () => 200,
        getHeader: () => undefined,
        getBody: () => '',
        getUnderlyingObject: () => undefined,
      },
    });
    await expect(controller.completed).resolves.toBeUndefined();
  });

  it('cancels without assuming the provider supports TUS object deletion', async () => {
    const controller = createTusPosterUpload(options);
    const completion = expect(controller.completed).rejects.toMatchObject({
      name: 'PosterUploadCancelled',
    });
    await controller.cancel();
    const upload = jest.mocked(Upload).mock.results[0];
    if (!upload || upload.type !== 'return') throw new Error('Expected a constructed TUS upload');
    expect(upload.value.abort).toHaveBeenCalledWith(false);
    await completion;
  });

  it('does not expose signed request details when uploading fails', async () => {
    const controller = createTusPosterUpload(options);
    const completion = expect(controller.completed).rejects.toThrow(
      'Poster upload failed. Please try again.',
    );
    uploadOptions().onError?.(new Error('sensitive-request-details'));
    await completion;
  });

  it('requires the selected local file to remain available and unchanged', () => {
    mockFileState.exists = false;
    expect(() => createTusPosterUpload(options)).toThrow('Please select it again');
    expect(Upload).not.toHaveBeenCalled();
  });
});
