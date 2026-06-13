import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { IoniconName } from '@/components/icons';
import type { UserRole } from '@/types';

export type RoleOption = { role: UserRole; label: string; description: string; icon: IoniconName };

export function useRoleOptions(): RoleOption[] {
  const { t } = useTranslation();
  return useMemo(
    () => [
      {
        role: 'fan' as UserRole,
        label: t('auth.signUp.roleFanLabel'),
        description: t('auth.signUp.roleFanDescription'),
        icon: 'ticket-outline',
      },
      {
        role: 'comedian' as UserRole,
        label: t('auth.signUp.roleComedianLabel'),
        description: t('auth.signUp.roleComedianDescription'),
        icon: 'mic-outline',
      },
      {
        role: 'venue' as UserRole,
        label: t('auth.signUp.roleVenueLabel'),
        description: t('auth.signUp.roleVenueDescription'),
        icon: 'trending-up-outline',
      },
    ],
    [t],
  );
}
