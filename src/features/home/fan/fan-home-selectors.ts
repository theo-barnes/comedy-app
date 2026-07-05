import type { HomeFeedResponse } from '@/lib/api/home-feed';

import { FAN_HOME_FIXTURE } from './fan-home-fixture';

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

/**
 * Maps the home-feed API response to the fan home view model, falling back to
 * fixture content per-section when the feed has no data for that section.
 */
export function selectFanHomeSections(feed: HomeFeedResponse | undefined): FanHomeSections {
  const thisWeek =
    feed && feed.nearbyEvents.length > 0
      ? feed.nearbyEvents.map((event) => ({
          id: event.id,
          title: event.title,
          subtitle: event.venueName,
        }))
      : FAN_HOME_FIXTURE.thisWeek;

  const performersNearYou =
    feed && feed.newComedians.length > 0
      ? feed.newComedians.map((comedian) => ({
          id: comedian.userId,
          name: comedian.stageName,
          subtitle: comedian.bio ?? '',
        }))
      : FAN_HOME_FIXTURE.performersNearYou;

  const freshClips =
    feed && feed.trendingClips.length > 0
      ? feed.trendingClips.map((clip) => ({
          id: clip.contentId,
          title: clip.title,
          comedianName: clip.creatorName,
          viewCount: `${clip.likeCount} likes`,
          duration: '',
        }))
      : FAN_HOME_FIXTURE.freshClips;

  return { thisWeek, performersNearYou, freshClips };
}
