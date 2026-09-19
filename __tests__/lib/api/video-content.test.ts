import { apiMutation, apiSend } from '@/lib/api/client';
import { completeVideoUpload, createVideo, deleteVideoContent } from '@/lib/api/video-content';

jest.mock('@/lib/api/client', () => ({
  apiFetch: jest.fn(),
  apiMutation: jest.fn(),
  apiSend: jest.fn(),
  isApiConfigured: jest.fn(() => true),
}));

const mockApiMutation = apiMutation as jest.MockedFunction<typeof apiMutation>;
const mockApiSend = apiSend as jest.MockedFunction<typeof apiSend>;

describe('video content API', () => {
  beforeEach(() => mockApiMutation.mockReset());

  it('creates video metadata without sending binary data to FastAPI', async () => {
    mockApiMutation.mockResolvedValue({});
    await createVideo({
      caption: 'A short set',
      file: { name: 'clip.mp4', sizeBytes: 1024, mimeType: 'video/mp4' },
    });

    expect(mockApiMutation).toHaveBeenCalledWith(
      '/content',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          type: 'video_clip',
          description: 'A short set',
          file: { name: 'clip.mp4', sizeBytes: 1024, mimeType: 'video/mp4' },
        }),
      }),
    );
  });

  it('confirms a completed direct upload by media attempt ID', async () => {
    mockApiMutation.mockResolvedValue({});
    await completeVideoUpload('content-1', 'media-1', 1024);
    expect(mockApiMutation).toHaveBeenCalledWith(
      '/content/content-1/upload-complete',
      expect.objectContaining({
        body: { mediaAssetId: 'media-1', bytesUploaded: 1024 },
      }),
    );
  });

  it('soft-removes cancelled content', async () => {
    mockApiSend.mockResolvedValue(undefined);
    await deleteVideoContent('content-1');
    expect(mockApiSend).toHaveBeenCalledWith('/content/content-1', { method: 'DELETE' });
  });
});
