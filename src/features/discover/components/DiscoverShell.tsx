import { DiscoverScreenLayout } from './DiscoverScreenLayout';
import { DiscoverFeed } from './DiscoverFeed';

type Props = {
  avatarUri?: string;
};

export function DiscoverShell({ avatarUri }: Props) {
  return (
    <DiscoverScreenLayout avatarUri={avatarUri}>
      <DiscoverFeed />
    </DiscoverScreenLayout>
  );
}
