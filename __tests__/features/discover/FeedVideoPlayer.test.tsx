import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { FeedVideoPlayer } from '@/features/discover/components/FeedVideoPlayer';

import { renderWithTheme } from '../../utils/renderWithTheme';

const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockReplaceAsync = jest.fn().mockResolvedValue(undefined);
const mockPlayer = {
  loop: false,
  muted: false,
  staysActiveInBackground: true,
  status: 'readyToPlay',
  play: mockPlay,
  pause: mockPause,
  replaceAsync: mockReplaceAsync,
};

let mockStatus = 'readyToPlay';

jest.mock('expo', () => ({
  useEvent: () => ({ status: mockStatus }),
}));

jest.mock('expo-video', () => {
  const { View } = jest.requireActual('react-native');

  return {
    useVideoPlayer: (_source: unknown, setup: (instance: typeof mockPlayer) => void) => {
      setup(mockPlayer);
      return mockPlayer;
    },
    VideoView: (props: object) => <View {...props} />,
  };
});

describe('FeedVideoPlayer', () => {
  beforeEach(() => {
    mockStatus = 'readyToPlay';
    mockPlay.mockClear();
    mockPause.mockClear();
    mockReplaceAsync.mockClear();
  });

  it('plays only while active and applies mute state', () => {
    const { rerender } = renderWithTheme(
      <FeedVideoPlayer uri="https://example.com/video.m3u8" isActive muted />,
    );

    expect(mockPlay).toHaveBeenCalled();
    expect(mockPlayer.muted).toBe(true);

    rerender(
      <FeedVideoPlayer uri="https://example.com/video.m3u8" isActive={false} muted={false} />,
    );

    expect(mockPause).toHaveBeenCalled();
    expect(mockPlayer.muted).toBe(false);
  });

  it('keeps the thumbnail visible until the first frame renders', () => {
    renderWithTheme(
      <FeedVideoPlayer
        uri="https://example.com/video.m3u8"
        thumbnailUri="https://example.com/thumb.jpg"
        isActive
        muted
      />,
    );

    expect(screen.getByTestId('feed-video-thumbnail')).toBeTruthy();
    fireEvent(screen.getByTestId('feed-video-view'), 'firstFrameRender');
    expect(screen.queryByTestId('feed-video-thumbnail')).toBeNull();
  });

  it('shows buffering and retries playback failures', async () => {
    mockStatus = 'error';
    const onPlaybackError = jest.fn();
    renderWithTheme(
      <FeedVideoPlayer
        uri="https://example.com/video.m3u8"
        isActive
        muted
        onPlaybackError={onPlaybackError}
      />,
    );

    expect(screen.getByText('Video unavailable')).toBeTruthy();
    expect(onPlaybackError).toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(mockReplaceAsync).toHaveBeenCalled());
    expect(mockPlay).toHaveBeenCalled();
  });
});
