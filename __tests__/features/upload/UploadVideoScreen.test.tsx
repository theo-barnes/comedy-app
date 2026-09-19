import { fireEvent, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';

import { UploadVideoScreen } from '@/features/upload/UploadVideoScreen';
import { renderWithTheme } from '../../utils/renderWithTheme';

const mockUseAuth = jest.fn();
jest.mock('@/features/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockCreateMutateAsync = jest.fn();
const mockCompleteMutateAsync = jest.fn();
const mockDeleteVideoContent = jest.fn();
let mockContentStatus: { data?: { status: string } } = {};

jest.mock('@/lib/api/video-content', () => ({
  useCreateVideo: () => ({ mutateAsync: mockCreateMutateAsync, isPending: false }),
  useCompleteVideoUpload: () => ({ mutateAsync: mockCompleteMutateAsync, isPending: false }),
  useContentStatus: () => mockContentStatus,
  deleteVideoContent: (...args: unknown[]) => mockDeleteVideoContent(...args),
}));

const mockController = {
  start: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  cancel: jest.fn().mockResolvedValue(undefined),
  completed: Promise.resolve(),
};
const mockCreateTusVideoUpload = jest.fn((..._args: unknown[]) => mockController);
jest.mock('@/features/upload/tus-upload', () => ({
  createTusVideoUpload: (...args: unknown[]) => mockCreateTusVideoUpload(...args),
}));

jest.mock('@/features/discover/components/FeedVideoPlayer', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  return { FeedVideoPlayer: View };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  getPendingResultAsync: jest.fn().mockResolvedValue(null),
  VideoExportPreset: { Passthrough: 0 },
}));

jest.mock('expo-file-system', () => ({
  File: class {
    size = 2048;
    type = 'video/mp4';
    name = 'fallback.mp4';
  },
}));

const mockRequestPermissions =
  ImagePicker.requestMediaLibraryPermissionsAsync as jest.MockedFunction<
    typeof ImagePicker.requestMediaLibraryPermissionsAsync
  >;
const mockLaunchLibrary = ImagePicker.launchImageLibraryAsync as jest.MockedFunction<
  typeof ImagePicker.launchImageLibraryAsync
>;

const videoAsset = {
  type: 'video',
  uri: 'file:///tmp/clip.mov',
  fileName: 'clip.mov',
  fileSize: 1024,
  mimeType: 'video/quicktime',
  duration: 30000,
  width: 1920,
  height: 1080,
} as unknown as ImagePicker.ImagePickerAsset;

function grantPickerWith(asset: ImagePicker.ImagePickerAsset) {
  mockRequestPermissions.mockResolvedValue({
    granted: true,
  } as ImagePicker.MediaLibraryPermissionResponse);
  mockLaunchLibrary.mockResolvedValue({
    canceled: false,
    assets: [asset],
  } as ImagePicker.ImagePickerSuccessResult);
}

async function pickAndUpload(screen: ReturnType<typeof renderWithTheme>) {
  fireEvent.press(screen.getByText('Select video'));
  await waitFor(() => expect(screen.getByText('Upload video')).toBeTruthy());
  fireEvent.press(screen.getByText('Upload video'));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockContentStatus = {};
  mockController.completed = Promise.resolve();
  mockUseAuth.mockReturnValue({ profile: { role: 'comedian' } });
  mockCreateMutateAsync.mockResolvedValue({
    content: { id: 'content-1' },
    upload: {
      mediaAssetId: 'media-1',
      protocol: 'tus',
      url: 'https://upload.example.com/tus',
      headers: { 'Tus-Resumable': '1.0.0' },
    },
  });
  mockCompleteMutateAsync.mockResolvedValue({ id: 'content-1', status: 'processing' });
});

describe('UploadVideoScreen', () => {
  it('blocks non-creator roles', () => {
    mockUseAuth.mockReturnValue({ profile: { role: 'fan' } });
    const screen = renderWithTheme(<UploadVideoScreen />);
    expect(screen.getByText('Creator access required')).toBeTruthy();
    expect(screen.queryByText('Select video')).toBeNull();
  });

  it('shows an error when photo library permission is denied', async () => {
    mockRequestPermissions.mockResolvedValue({
      granted: false,
    } as ImagePicker.MediaLibraryPermissionResponse);
    const screen = renderWithTheme(<UploadVideoScreen />);

    fireEvent.press(screen.getByText('Select video'));

    await waitFor(() =>
      expect(screen.getByText('Photo library access is required to select a video.')).toBeTruthy(),
    );
    expect(mockLaunchLibrary).not.toHaveBeenCalled();
  });

  it('rejects non-video assets', async () => {
    grantPickerWith({ ...videoAsset, type: 'image' } as unknown as ImagePicker.ImagePickerAsset);
    const screen = renderWithTheme(<UploadVideoScreen />);

    fireEvent.press(screen.getByText('Select video'));

    await waitFor(() => expect(screen.getByText('Select a video file.')).toBeTruthy());
  });

  it('rejects videos over the size limit', async () => {
    grantPickerWith({
      ...videoAsset,
      fileSize: 500 * 1024 * 1024 + 1,
    } as unknown as ImagePicker.ImagePickerAsset);
    const screen = renderWithTheme(<UploadVideoScreen />);

    fireEvent.press(screen.getByText('Select video'));

    await waitFor(() =>
      expect(screen.getByText('Videos must be smaller than 500 MB.')).toBeTruthy(),
    );
  });

  it('runs the create → TUS → complete upload lifecycle', async () => {
    grantPickerWith(videoAsset);
    const screen = renderWithTheme(<UploadVideoScreen />);

    await pickAndUpload(screen);

    await waitFor(() =>
      expect(mockCompleteMutateAsync).toHaveBeenCalledWith({
        contentId: 'content-1',
        mediaAssetId: 'media-1',
        bytesUploaded: 1024,
      }),
    );
    expect(mockCreateMutateAsync).toHaveBeenCalledWith({
      caption: '',
      file: {
        name: 'clip.mov',
        sizeBytes: 1024,
        mimeType: 'video/quicktime',
        durationMs: 30000,
        width: 1920,
        height: 1080,
      },
    });
    expect(mockCreateTusVideoUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: 'file:///tmp/clip.mov',
        sizeBytes: 1024,
        uploadUrl: 'https://upload.example.com/tus',
        headers: { 'Tus-Resumable': '1.0.0' },
      }),
    );
    expect(mockController.start).toHaveBeenCalled();
  });

  it('surfaces an error when the backend returns no upload descriptor', async () => {
    mockCreateMutateAsync.mockResolvedValue({ content: { id: 'content-1' }, upload: null });
    grantPickerWith(videoAsset);
    const screen = renderWithTheme(<UploadVideoScreen />);

    await pickAndUpload(screen);

    await waitFor(() => expect(screen.getByText('Upload could not be initialized.')).toBeTruthy());
    expect(mockCreateTusVideoUpload).not.toHaveBeenCalled();
  });

  it('cancels an in-flight upload and deletes the content record', async () => {
    // Keep the transfer pending so the progress UI stays mounted.
    mockController.completed = new Promise(() => {});
    grantPickerWith(videoAsset);
    const screen = renderWithTheme(<UploadVideoScreen />);

    await pickAndUpload(screen);
    await waitFor(() => expect(screen.getByText('Cancel')).toBeTruthy());
    fireEvent.press(screen.getByText('Cancel'));

    await waitFor(() => expect(mockDeleteVideoContent).toHaveBeenCalledWith('content-1'));
    expect(mockController.cancel).toHaveBeenCalled();
    expect(mockCompleteMutateAsync).not.toHaveBeenCalled();
  });

  it('shows the published state once content status resolves', async () => {
    mockContentStatus = { data: { status: 'published' } };
    grantPickerWith(videoAsset);
    const screen = renderWithTheme(<UploadVideoScreen />);

    await waitFor(() => expect(screen.getByText('Your clip is live')).toBeTruthy());
    // Published state hides the upload form entirely.
    expect(screen.queryByText('Upload video')).toBeNull();
  });
});
