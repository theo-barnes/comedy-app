import { DiscoverShell } from '../components/DiscoverShell';
import { getDiscoverConfig } from '../config';

export function FanDiscover() {
  return <DiscoverShell config={getDiscoverConfig('fan')} />;
}
