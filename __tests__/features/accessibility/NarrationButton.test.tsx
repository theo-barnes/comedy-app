import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { NarrationButton } from '@/features/accessibility/NarrationButton';

import { renderWithTheme } from '../../utils/renderWithTheme';

const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockReplaceAsync = jest.fn().mockResolvedValue(undefined);
const mockDispose = jest.fn();
const mockFetchNarrationAudio = jest.fn();
const mockPlayer = {
  play: mockPlay,
  pause: mockPause,
  replaceAsync: mockReplaceAsync,
};

let mockIsPlaying = false;

jest.mock('expo', () => ({
  useEvent: () => ({ isPlaying: mockIsPlaying }),
}));

jest.mock('expo-video', () => ({
  useVideoPlayer: () => mockPlayer,
}));

jest.mock('@/lib/api/narration', () => ({
  fetchNarrationAudio: (...args: unknown[]) => mockFetchNarrationAudio(...args),
}));

describe('NarrationButton', () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api-dev.example.com';
    mockIsPlaying = false;
    mockPlay.mockReset();
    mockPause.mockReset();
    mockReplaceAsync.mockClear();
    mockDispose.mockReset();
    mockFetchNarrationAudio.mockReset();
    mockFetchNarrationAudio.mockResolvedValue({
      file: { uri: 'file:///cache/narration.mp3' },
      dispose: mockDispose,
    });
  });

  afterAll(() => {
    if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
  });

  it('retrieves the allowed resource through the internal narration API before playback', async () => {
    renderWithTheme(
      <NarrationButton resourceType="event" resourceId="event-1" label="Friday comedy" />,
    );

    fireEvent.press(screen.getByText('accessibility.listen'));

    await waitFor(() =>
      expect(mockFetchNarrationAudio).toHaveBeenCalledWith('event', 'event-1', expect.anything()),
    );
    expect(mockReplaceAsync).toHaveBeenCalledWith('file:///cache/narration.mp3');
    expect(mockPlay).toHaveBeenCalled();
  });

  it('retains an accessible error state when narration cannot be fetched', async () => {
    mockFetchNarrationAudio.mockRejectedValue(new Error('Narration request failed'));
    renderWithTheme(
      <NarrationButton resourceType="event" resourceId="event-1" label="Friday comedy" />,
    );

    fireEvent.press(screen.getByText('accessibility.listen'));

    expect(await screen.findByText('Narration request failed')).toBeTruthy();
    expect(mockPlay).not.toHaveBeenCalled();
  });
});
