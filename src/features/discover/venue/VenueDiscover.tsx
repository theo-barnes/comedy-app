import { DiscoverShell } from '../components/DiscoverShell';
import { getDiscoverConfig } from '../config';

export function VenueDiscover() {
  return <DiscoverShell config={getDiscoverConfig('venue')} />;
}
