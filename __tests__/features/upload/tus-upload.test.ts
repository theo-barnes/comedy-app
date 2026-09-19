import { Upload } from 'tus-js-client';

import { createTusVideoUpload } from '@/features/upload/tus-upload';

const mockStart = jest.fn();
const mockAbort = jest.fn().mockResolvedValue(undefined);
let mockOptions: Record<string, unknown>;

jest.mock('tus-js-client', () => ({
  Upload: jest.fn((_file, options) => {
    mockOptions = options;
    return { start: mockStart, abort: mockAbort };
  }),
}));

describe('createTusVideoUpload', () => {
  beforeEach(() => {
    mockStart.mockClear();
    mockAbort.mockClear();
  });

  it('uses the provisioned upload URL and reports progress', async () => {
    const onProgress = jest.fn();
    const controller = createTusVideoUpload({
      uri: 'file:///clip.mp4',
      sizeBytes: 100,
      mimeType: 'video/mp4',
      uploadUrl: 'https://upload.example/asset',
      headers: { 'Tus-Resumable': '1.0.0' },
      onProgress,
    });

    expect(Upload).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file:///clip.mp4' }),
      expect.objectContaining({
        uploadUrl: 'https://upload.example/asset',
        uploadSize: 100,
      }),
    );
    (mockOptions.onProgress as (sent: number, total: number) => void)(40, 100);
    expect(onProgress).toHaveBeenCalledWith(0.4);

    controller.start();
    expect(mockStart).toHaveBeenCalled();
    await controller.pause();
    expect(mockAbort).toHaveBeenCalledWith(false);
    const cancelled = expect(controller.completed).rejects.toThrow('Upload cancelled.');
    await controller.cancel();
    expect(mockAbort).toHaveBeenCalledWith(true);
    await cancelled;
  });

  it('resolves completion only after TUS succeeds', async () => {
    const controller = createTusVideoUpload({
      uri: 'file:///clip.mp4',
      sizeBytes: 100,
      mimeType: 'video/mp4',
      uploadUrl: 'https://upload.example/asset',
      headers: {},
      onProgress: jest.fn(),
    });

    (mockOptions.onSuccess as () => void)();
    await expect(controller.completed).resolves.toBeUndefined();
  });
});
