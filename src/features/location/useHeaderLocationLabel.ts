import { useContext, useMemo } from 'react';

import { AuthContext } from '@/features/auth/context';
import { LocationContext } from '@/features/location/LocationProvider';

const SET_LOCATION_LABEL = 'Set location';

type HeaderLocationLabel = {
  cityLabel: string;
  onCityPress?: () => void;
};

export function useHeaderLocationLabel(): HeaderLocationLabel {
  const auth = useContext(AuthContext);
  const location = useContext(LocationContext);

  return useMemo(() => {
    const profileCity = auth?.profile?.home_city?.trim();
    if (profileCity) {
      return { cityLabel: profileCity };
    }

    const resolvedCity = location?.cityLabel?.trim();
    if (resolvedCity) {
      return { cityLabel: resolvedCity };
    }

    if (!location) {
      return { cityLabel: SET_LOCATION_LABEL };
    }

    return {
      cityLabel: SET_LOCATION_LABEL,
      onCityPress: () => {
        void location.handleSetLocationPress();
      },
    };
  }, [auth?.profile?.home_city, location]);
}
