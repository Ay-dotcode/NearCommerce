import {
  METERS_PER_MILE,
  SEARCH_RADIUS_DEFAULT_MILES,
  SEARCH_RADIUS_KEY,
  SEARCH_RADIUS_MAX_MILES,
  SEARCH_RADIUS_MIN_MILES,
} from "@/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// How far from the shopper a store may be to show up in results. Kept in memory for instant
// reads, saved on the device, and broadcast so every screen refreshes when it changes.
let radiusMiles = SEARCH_RADIUS_DEFAULT_MILES;
// Bumped on every change, so a slow load can't overwrite a newer choice.
let version = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const clampRadiusMiles = (value: number) =>
  Math.min(
    SEARCH_RADIUS_MAX_MILES,
    Math.max(SEARCH_RADIUS_MIN_MILES, Math.round(value)),
  );

export const milesToMeters = (miles: number) =>
  Math.round(miles * METERS_PER_MILE);

export const getSearchRadiusMiles = () => radiusMiles;

export function subscribeSearchRadius(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function loadSearchRadius() {
  const startedAt = version;
  try {
    const raw = await AsyncStorage.getItem(SEARCH_RADIUS_KEY);
    const parsed = raw === null ? NaN : Number(raw);
    if (startedAt === version)
      radiusMiles = Number.isFinite(parsed)
        ? clampRadiusMiles(parsed)
        : SEARCH_RADIUS_DEFAULT_MILES;
  } catch {
    if (startedAt === version) radiusMiles = SEARCH_RADIUS_DEFAULT_MILES;
  }
  notify();
  return radiusMiles;
}

export async function setSearchRadiusMiles(miles: number) {
  version++;
  radiusMiles = clampRadiusMiles(miles);
  notify();
  await AsyncStorage.setItem(SEARCH_RADIUS_KEY, String(radiusMiles));
}
