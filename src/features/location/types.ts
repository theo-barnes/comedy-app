export type LocationPermissionState = 'unknown' | 'granted' | 'denied' | 'blocked';

export type LocationErrorCode =
  | 'permission-denied'
  | 'permission-blocked'
  | 'services-disabled'
  | 'geocode-failed'
  | 'unavailable';

export type ResolvedLocation = {
  cityLabel: string;
  latitude: number;
  longitude: number;
  timestamp: number;
};

export type CachedLocation = ResolvedLocation;

export type LocationState = {
  cityLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  permission: LocationPermissionState;
  errorCode: LocationErrorCode | null;
  isLoading: boolean;
};
