import * as Location from 'expo-location';

import type {
  LocationErrorCode,
  LocationPermissionState,
  ResolvedLocation,
} from '@/features/location/types';

export type LocationResolutionSuccess = {
  ok: true;
  permission: LocationPermissionState;
  location: ResolvedLocation;
};

export type LocationResolutionFailure = {
  ok: false;
  permission: LocationPermissionState;
  errorCode: LocationErrorCode;
};

export type LocationResolutionResult = LocationResolutionSuccess | LocationResolutionFailure;

export function pickCityLabel(addresses: Location.LocationGeocodedAddress[]): string | null {
  const primary = addresses[0];
  if (!primary) return null;

  const candidate =
    primary.city?.trim() ||
    primary.district?.trim() ||
    primary.subregion?.trim() ||
    primary.region?.trim() ||
    null;

  return candidate && candidate.length > 0 ? candidate : null;
}

function toPermissionState(response: {
  granted: boolean;
  status: Location.PermissionStatus;
  canAskAgain: boolean;
}): LocationPermissionState {
  if (response.granted || response.status === Location.PermissionStatus.GRANTED) return 'granted';
  return response.canAskAgain ? 'denied' : 'blocked';
}

export async function getForegroundPermission() {
  return Location.getForegroundPermissionsAsync();
}

export async function resolveCurrentCity(
  allowPermissionRequest: boolean,
): Promise<LocationResolutionResult> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return { ok: false, permission: 'unknown', errorCode: 'services-disabled' };
    }

    let permission = await Location.getForegroundPermissionsAsync();

    if (!permission.granted && allowPermissionRequest) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    const permissionState = toPermissionState(permission);
    if (!permission.granted) {
      return {
        ok: false,
        permission: permissionState,
        errorCode: permission.canAskAgain ? 'permission-denied' : 'permission-blocked',
      };
    }

    const lastKnown = await Location.getLastKnownPositionAsync({
      maxAge: 5 * 60 * 1000,
      requiredAccuracy: 500,
    });

    const current =
      lastKnown ??
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }));

    const { latitude, longitude } = current.coords;
    const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
    const cityLabel = pickCityLabel(addresses);

    if (!cityLabel) {
      return { ok: false, permission: permissionState, errorCode: 'geocode-failed' };
    }

    return {
      ok: true,
      permission: permissionState,
      location: {
        cityLabel,
        latitude,
        longitude,
        timestamp: Date.now(),
      },
    };
  } catch {
    return { ok: false, permission: 'unknown', errorCode: 'unavailable' };
  }
}
