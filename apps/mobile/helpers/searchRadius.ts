import {
  METERS_PER_KM,
  NEARBY_ONLY_KEY,
  SEARCH_RADIUS_DEFAULT_KM,
  SEARCH_RADIUS_KEY,
  SEARCH_RADIUS_MAX_KM,
  SEARCH_RADIUS_MIN_KM,
} from "@/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// How far from the shopper a store may be to show up in results, and whether that limit is
// applied at all. Kept in memory for instant reads, saved on the device, and broadcast so every
// screen refreshes when either changes.
let radiusKm = SEARCH_RADIUS_DEFAULT_KM;
let nearbyOnly = true;
// Bumped on every change, so a slow load can't overwrite a newer choice.
let version = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const clampRadiusKm = (value: number) =>
  Math.min(SEARCH_RADIUS_MAX_KM, Math.max(SEARCH_RADIUS_MIN_KM, Math.round(value)));

export const kmToMeters = (km: number) => Math.round(km * METERS_PER_KM);

export const getSearchRadiusKm = () => radiusKm;
export const getNearbyOnly = () => nearbyOnly;

export function subscribeSearchRadius(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function loadSearchRadius() {
  const startedAt = version;
  try {
    const [rawRadius, rawNearby] = await Promise.all([
      AsyncStorage.getItem(SEARCH_RADIUS_KEY),
      AsyncStorage.getItem(NEARBY_ONLY_KEY),
    ]);
    if (startedAt === version) {
      const parsed = rawRadius === null ? NaN : Number(rawRadius);
      radiusKm = Number.isFinite(parsed)
        ? clampRadiusKm(parsed)
        : SEARCH_RADIUS_DEFAULT_KM;
      nearbyOnly = rawNearby !== "false";
    }
  } catch {
    if (startedAt === version) {
      radiusKm = SEARCH_RADIUS_DEFAULT_KM;
      nearbyOnly = true;
    }
  }
  notify();
  return radiusKm;
}

export async function setSearchRadiusKm(km: number) {
  version++;
  radiusKm = clampRadiusKm(km);
  notify();
  await AsyncStorage.setItem(SEARCH_RADIUS_KEY, String(radiusKm));
}

export async function setNearbyOnly(value: boolean) {
  version++;
  nearbyOnly = value;
  notify();
  await AsyncStorage.setItem(NEARBY_ONLY_KEY, String(value));
}
