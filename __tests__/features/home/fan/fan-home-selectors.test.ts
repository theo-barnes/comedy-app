import { FAN_HOME_FIXTURE } from '@/features/home/fan/fan-home-fixture';
import { selectFanHomeSections } from '@/features/home/fan/fan-home-selectors';
import type { HomeFeedResponse } from '@/lib/api/home-feed';

const EMPTY_FEED: HomeFeedResponse = {
  nearbyEvents: [],
  trendingClips: [],
  followedCreators: [],
  newComedians: [],
};

const POPULATED_FEED: HomeFeedResponse = {
  nearbyEvents: [
    {
      id: 'event-1',
      title: 'Open Mic Night',
      startTime: '2026-06-05T20:00:00Z',
      venueId: 'venue-1',
      venueName: 'The Basement Room',
    },
  ],
  trendingClips: [
    {
      contentId: 'clip-1',
      contentType: 'clip',
      title: 'First-time crowd work',
      creatorId: 'creator-1',
      creatorName: 'Alex Doe',
      publishedAt: '2026-06-01T12:00:00Z',
      likeCount: 42,
      saveCount: 5,
      viewerLiked: false,
      viewerSaved: false,
    },
  ],
  followedCreators: [],
  newComedians: [
    {
      userId: 'user-1',
      stageName: 'Alex Doe',
      bio: 'Observational comedy',
    },
  ],
};

describe('selectFanHomeSections', () => {
  it('falls back to fixture content when the feed is undefined', () => {
    const sections = selectFanHomeSections(undefined);
    expect(sections.thisWeek).toBe(FAN_HOME_FIXTURE.thisWeek);
    expect(sections.performersNearYou).toBe(FAN_HOME_FIXTURE.performersNearYou);
    expect(sections.freshClips).toBe(FAN_HOME_FIXTURE.freshClips);
  });

  it('falls back per-section when the feed sections are empty', () => {
    const sections = selectFanHomeSections(EMPTY_FEED);
    expect(sections.thisWeek).toBe(FAN_HOME_FIXTURE.thisWeek);
    expect(sections.performersNearYou).toBe(FAN_HOME_FIXTURE.performersNearYou);
    expect(sections.freshClips).toBe(FAN_HOME_FIXTURE.freshClips);
  });

  it('maps feed data to the view model when present', () => {
    const sections = selectFanHomeSections(POPULATED_FEED);
    expect(sections.thisWeek).toEqual([
      { id: 'event-1', title: 'Open Mic Night', subtitle: 'The Basement Room' },
    ]);
    expect(sections.performersNearYou).toEqual([
      { id: 'user-1', name: 'Alex Doe', subtitle: 'Observational comedy' },
    ]);
    expect(sections.freshClips).toEqual([
      {
        id: 'clip-1',
        title: 'First-time crowd work',
        comedianName: 'Alex Doe',
        viewCount: '42 likes',
        duration: '',
      },
    ]);
  });

  it('defaults a missing comedian bio to an empty string', () => {
    const sections = selectFanHomeSections({
      ...EMPTY_FEED,
      newComedians: [{ userId: 'user-2', stageName: 'Sam Roe', bio: null }],
    });
    expect(sections.performersNearYou).toEqual([{ id: 'user-2', name: 'Sam Roe', subtitle: '' }]);
  });
});
