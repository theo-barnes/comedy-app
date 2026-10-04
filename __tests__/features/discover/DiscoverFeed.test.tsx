import { act, fireEvent, screen } from '@testing-library/react-native';

import { DiscoverFeed } from '@/features/discover/components/DiscoverFeed';

import { renderWithTheme } from '../../utils/renderWithTheme';

const mockUseVideoFeed = jest.fn();
const mockMutate = jest.fn();
const mockPush = jest.fn();

function flatten(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(3).filter(Boolean));
}

jest.mock('expo-router', () => ({
  useFocusEffect: () => {},
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/lib/api/video-feed', () => ({
  useVideoFeed: () => mockUseVideoFeed(),
}));

jest.mock('@/lib/api/engagement', () => ({
  useToggleLike: () => ({
    isPending: false,
    variables: undefined,
    mutate: mockMutate,
  }),
}));

jest.mock('@/features/discover/components/FeedVideoPlayer', () => ({
  FeedVideoPlayer: () => null,
}));

function videoFeedQuery() {
  return {
    data: {
      pages: [
        {
          items: [
            {
              contentId: 'clip-1',
              contentType: 'video_clip',
              title: 'Late Set',
              description: null,
              creatorId: 'creator-1',
              creatorName: 'Asha',
              publishedAt: '2026-10-04T12:00:00.000Z',
              hlsUrl: 'https://example.com/clip.m3u8',
              thumbnailUrl: null,
              imageUrl: null,
              linkedEvent: null,
              likeCount: 0,
              saveCount: 0,
              viewerLiked: false,
              viewerSaved: false,
            },
          ],
          nextCursor: null,
        },
      ],
    },
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isPending: false,
    isRefetching: false,
    fetchNextPage: jest.fn(),
    refetch: jest.fn(),
  };
}

describe('DiscoverFeed', () => {
  beforeEach(() => {
    mockMutate.mockReset();
    mockPush.mockReset();
    mockUseVideoFeed.mockReturnValue(videoFeedQuery());
  });

  it('optimistically likes a clip and restores its feed state if the mutation fails', async () => {
    let mutationOptions: { onError?: () => void } | undefined;
    mockMutate.mockImplementation((_variables, options) => {
      mutationOptions = options;
    });

    renderWithTheme(<DiscoverFeed />);
    fireEvent(screen.getByTestId('discover-feed'), 'layout', {
      nativeEvent: { layout: { height: 600 } },
    });
    await act(async () => {});

    expect(screen.getByText('@Asha')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Like clip' }));

    expect(mockMutate).toHaveBeenCalledWith(
      { contentId: 'clip-1', liked: false },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
    expect(screen.getByRole('button', { name: 'Unlike clip' })).toBeTruthy();

    act(() => mutationOptions?.onError?.());
    expect(screen.getByRole('button', { name: 'Like clip' })).toBeTruthy();
  });

  it('keeps a UI-only search control in a fixed overlay above the clip feed', async () => {
    renderWithTheme(<DiscoverFeed />);
    fireEvent(screen.getByTestId('discover-feed'), 'layout', {
      nativeEvent: { layout: { height: 600 } },
    });
    await act(async () => {});

    const search = screen.getByTestId('discover-search');
    expect(flatten(search.props.style)).toMatchObject({ position: 'absolute' });

    fireEvent.press(screen.getByTestId('discover-search-toggle'));
    const input = screen.getByTestId('discover-search-input');
    fireEvent.changeText(input, 'late night');
    fireEvent(input, 'submitEditing');
    expect(input.props.value).toBe('late night');

    fireEvent.press(screen.getByTestId('discover-search-toggle'));
    expect(
      screen.getByTestId('discover-search-input', { includeHiddenElements: true }).props.value,
    ).toBe('');
  });

  it('pushes the uploader public profile when the caption name is pressed', async () => {
    renderWithTheme(<DiscoverFeed />);
    fireEvent(screen.getByTestId('discover-feed'), 'layout', {
      nativeEvent: { layout: { height: 600 } },
    });
    await act(async () => {});

    fireEvent.press(screen.getByRole('button', { name: "View Asha's profile" }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/profile/[userId]',
      params: { userId: 'creator-1' },
    });
  });
});
