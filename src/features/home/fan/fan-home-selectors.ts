import type { HomeFeedResponse } from '@/lib/api/home-feed';

export type FanHomeEvent = { id: string; title: string; subtitle: string };
export type FanHomePerformer = { id: string; name: string; subtitle: string };
export type FanHomeClip = {
  id: string;
  title: string;
  comedianName: string;
  viewCount: string;
  duration: string;
};

export type FanHomeSections = {
  thisWeek: FanHomeEvent[];
  performersNearYou: FanHomePerformer[];
  freshClips: FanHomeClip[];
};

export function selectFanHomeSections(feed: HomeFeedResponse | undefined): FanHomeSections {
  const thisWeek =
    feed?.nearbyEvents.map((event) => ({
      id: event.id,
      title: event.title,
      subtitle: event.venueName,
    })) ?? [];

  const performersNearYou =
    feed?.newComedians.map((comedian) => ({
      id: comedian.userId,
      name: comedian.stageName,
      subtitle: comedian.bio ?? '',
    })) ?? [];

  const freshClips =
    feed?.trendingClips.map((clip) => ({
      id: clip.contentId,
      title: clip.title,
      comedianName: clip.creatorName,
      viewCount: `${clip.likeCount} likes`,
      duration: '',
    })) ?? [];

  return { thisWeek, performersNearYou, freshClips };
}
