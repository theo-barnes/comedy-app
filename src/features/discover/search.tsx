import type { ComponentType } from 'react';

import { useAuth } from '@/features/auth/useAuth';
import type { UserRole } from '@/types';

import { ComedianDiscover } from './comedian/ComedianDiscover';
import { FanDiscover } from './fan/FanDiscover';
import { VenueDiscover } from './venue/VenueDiscover';

const DISCOVER_BY_ROLE: Record<UserRole, ComponentType> = {
  fan: FanDiscover,
  comedian: ComedianDiscover,
  venue: VenueDiscover,
};

export function DiscoverScreen() {
  const { profile, isLoading } = useAuth();

  // During auth bootstrap, render nothing rather than a flash of the wrong screen.
  if (isLoading) return null;

  const role = profile?.role ?? 'fan';
  const RoleDiscover = DISCOVER_BY_ROLE[role];
  return <RoleDiscover />;
}
