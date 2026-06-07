import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { Linking } from 'react-native';

import { LargeSecureStore } from '@/lib/large-secure-store';
import type { LocationErrorCode, LocationPermissionState, ResolvedLocation } from './types';
import { getForegroundPermission, resolveCurrentCity } from './location-service';

type LocationContextValue = {
  cityLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  permission: LocationPermissionState;
  errorCode: LocationErrorCode | null;
  isLoading: boolean;
  requestPermissionAndResolve: () => Promise<void>;
  refreshLocation: () => Promise<void>;
  handleSetLocationPress: () => Promise<void>;
};

const LOCATION_CACHE_KEY = 'location.cache.v1';
const LOCATION_PROMPTED_KEY = 'location.prompted.v1';

export const LocationContext = createContext<LocationContextValue | null>(null);

function parseCachedLocation(raw: string | null): ResolvedLocation | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ResolvedLocation>;
    if (
      typeof parsed.cityLabel !== 'string' ||
      typeof parsed.latitude !== 'number' ||
      typeof parsed.longitude !== 'number' ||
      typeof parsed.timestamp !== 'number'
    ) {
      return null;
    }

    return {
      cityLabel: parsed.cityLabel,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      timestamp: parsed.timestamp,
    };
  } catch {
    return null;
  }
}

export function LocationProvider({ children }: PropsWithChildren) {
  const [cityLabel, setCityLabel] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [permission, setPermission] = useState<LocationPermissionState>('unknown');
  const [errorCode, setErrorCode] = useState<LocationErrorCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const applyResolvedLocation = useCallback((location: ResolvedLocation) => {
    if (!isMounted.current) return;
    setCityLabel(location.cityLabel);
    setLatitude(location.latitude);
    setLongitude(location.longitude);
    setErrorCode(null);
  }, []);

  const setFailureState = useCallback(
    (nextPermission: LocationPermissionState, code: LocationErrorCode) => {
      if (!isMounted.current) return;
      setPermission(nextPermission);
      setErrorCode(code);
      if (
        code === 'permission-denied' ||
        code === 'permission-blocked' ||
        code === 'services-disabled'
      ) {
        setCityLabel(null);
        setLatitude(null);
        setLongitude(null);
      }
    },
    [],
  );

  const resolve = useCallback(
    async (allowPermissionRequest: boolean) => {
      if (isMounted.current) {
        setIsLoading(true);
      }

      const result = await resolveCurrentCity(allowPermissionRequest);

      if (result.ok) {
        setPermission(result.permission);
        applyResolvedLocation(result.location);
        await LargeSecureStore.setItem(LOCATION_CACHE_KEY, JSON.stringify(result.location));
      } else {
        setFailureState(result.permission, result.errorCode);
      }

      if (isMounted.current) {
        setIsLoading(false);
      }
    },
    [applyResolvedLocation, setFailureState],
  );

  const requestPermissionAndResolve = useCallback(async () => {
    await resolve(true);
  }, [resolve]);

  const refreshLocation = useCallback(async () => {
    await resolve(false);
  }, [resolve]);

  const handleSetLocationPress = useCallback(async () => {
    const permissionStatus = await getForegroundPermission();

    if (!permissionStatus.granted && !permissionStatus.canAskAgain) {
      await Linking.openSettings();
      return;
    }

    await requestPermissionAndResolve();
  }, [requestPermissionAndResolve]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const [cachedRaw, promptedRaw] = await Promise.all([
        LargeSecureStore.getItem(LOCATION_CACHE_KEY),
        LargeSecureStore.getItem(LOCATION_PROMPTED_KEY),
      ]);

      if (cancelled || !isMounted.current) return;

      const cached = parseCachedLocation(cachedRaw);
      if (cached) {
        applyResolvedLocation(cached);
      }

      const hasPrompted = promptedRaw === 'true';
      if (!hasPrompted) {
        await LargeSecureStore.setItem(LOCATION_PROMPTED_KEY, 'true');
        await requestPermissionAndResolve();
        return;
      }

      await refreshLocation();
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [applyResolvedLocation, refreshLocation, requestPermissionAndResolve]);

  const value = useMemo<LocationContextValue>(
    () => ({
      cityLabel,
      latitude,
      longitude,
      permission,
      errorCode,
      isLoading,
      requestPermissionAndResolve,
      refreshLocation,
      handleSetLocationPress,
    }),
    [
      cityLabel,
      latitude,
      longitude,
      permission,
      errorCode,
      isLoading,
      requestPermissionAndResolve,
      refreshLocation,
      handleSetLocationPress,
    ],
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}
