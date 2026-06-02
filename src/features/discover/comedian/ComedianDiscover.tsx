import { DiscoverShell } from '../components/DiscoverShell';
import { getDiscoverConfig } from '../config';

export function ComedianDiscover() {
  return <DiscoverShell config={getDiscoverConfig('comedian')} />;
}
