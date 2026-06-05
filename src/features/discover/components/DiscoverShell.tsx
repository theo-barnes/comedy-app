import type { DiscoverConfig } from '../types';
import { ClipsFeed } from './ClipsFeed';
import { DiscoverScreenLayout } from './DiscoverScreenLayout';

type Props = {
  config: DiscoverConfig;
  avatarUri?: string;
};

export function DiscoverShell({ config, avatarUri }: Props) {
  return (
    <DiscoverScreenLayout config={config} avatarUri={avatarUri}>
      <ClipsFeed items={config.clips.feed} />
    </DiscoverScreenLayout>
  );
}
