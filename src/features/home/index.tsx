import type { ComponentType } from 'react';

import { useAuth } from '@/features/auth/useAuth';
import type { UserRole } from '@/types';

import { ComedianHome } from './comedian/ComedianHome';
import { FanHome } from './fan/FanHome';
import { VenueHome } from './venue/VenueHome';

const HOME_BY_ROLE: Record<UserRole, ComponentType> = {
  fan: FanHome,
  comedian: ComedianHome,
  venue: VenueHome,
};

export function HomeScreen() {
  const { profile, isLoading } = useAuth();

  // During auth bootstrap, render nothing rather than a flash of the wrong screen.
  if (isLoading) return null;

  const role = profile?.role ?? 'fan';
  const RoleHome = HOME_BY_ROLE[role];
  return <RoleHome />;
}
