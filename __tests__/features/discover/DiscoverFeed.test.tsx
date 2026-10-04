import { act, fireEvent, screen } from '@testing-library/react-native';

import { DiscoverFeed } from '@/features/discover/components/DiscoverFeed';

import { renderWithTheme } from '../../utils/renderWithTheme';

const mockUseVideoFeed = jest.fn();
const mockMutate = jest.fn();

jest.mock('expo-router', () => ({
  useFocusEffect: () => {},
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
    mockUseVideoFeed.mockReturnValue(videoFeedQuery());
  });

  it('optimistically likes a clip and restores its feed state if the mutation fails', () => {
    let mutationOptions: { onError?: () => void } | undefined;
    mockMutate.mockImplementation((_variables, options) => {
      mutationOptions = options;
    });

    renderWithTheme(<DiscoverFeed />);
    fireEvent(screen.getByTestId('discover-feed'), 'layout', {
      nativeEvent: { layout: { height: 600 } },
    });

    fireEvent.press(screen.getByRole('button', { name: 'Like clip' }));

    expect(mockMutate).toHaveBeenCalledWith(
      { contentId: 'clip-1', liked: false },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
    expect(screen.getByRole('button', { name: 'Unlike clip' })).toBeTruthy();

    act(() => mutationOptions?.onError?.());
    expect(screen.getByRole('button', { name: 'Like clip' })).toBeTruthy();
  });
});
