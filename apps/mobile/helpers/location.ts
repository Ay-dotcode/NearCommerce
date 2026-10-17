import { POSTAL_CODE_PATTERN } from "@/constants";
import type { Coords, ManualLocation } from "@/types/location";
import { PostalCodeError } from "@/types/location";
import { formatPlaceName } from "@/helpers/placeName";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import Toast from "react-native-toast-message";
export type {
  Coords,
  ManualLocation,
  PostalCodeErrorReason,
} from "@/types/location";
export { PostalCodeError };

const MANUAL_LOCATION_KEY = "@nearcommerce_manual_location";
const DEFAULT_COORDS = { latitude: 0, longitude: 0 };

// A ZIP code the shopper typed in. It replaces GPS until they clear it.
let manualLocation: ManualLocation | null = null;
// Bumped on every set or clear, so a slow load can't undo a newer change.
let manualVersion = 0;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

export function subscribeManualLocation(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getManualLocation = () => manualLocation;

export async function loadManualLocation() {
  const startedAt = manualVersion;
  try {
    const raw = await AsyncStorage.getItem(MANUAL_LOCATION_KEY);
    const parsed = raw ? (JSON.parse(raw) as ManualLocation) : null;
    const valid =
      parsed &&
      typeof parsed.latitude === "number" &&
      typeof parsed.longitude === "number";
    if (startedAt === manualVersion) manualLocation = valid ? parsed : null;
  } catch {
    if (startedAt === manualVersion) manualLocation = null;
  }
  notify();
  return manualLocation;
}

export async function setManualLocation(location: ManualLocation) {
  manualVersion++;
  manualLocation = location;
  await AsyncStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify(location));
  notify();
}

export async function clearManualLocation() {
  manualVersion++;
  manualLocation = null;
  await AsyncStorage.removeItem(MANUAL_LOCATION_KEY);
  notify();
}

// Turns a typed ZIP / postal code into coordinates using the phone's geocoder.
export async function resolvePostalCode(raw: string): Promise<ManualLocation> {
  const postalCode = raw.trim().toUpperCase();
  if (!POSTAL_CODE_PATTERN.test(postalCode))
    throw new PostalCodeError("invalid");

  let results: Location.LocationGeocodedLocation[];
  try {
    results = await Location.geocodeAsync(postalCode);
  } catch {
    throw new PostalCodeError("unavailable");
  }
  const first = results[0];
  if (!first) throw new PostalCodeError("not_found");
  return { postalCode, latitude: first.latitude, longitude: first.longitude };
}

let sessionLocation: Location.LocationObjectCoords | null = null;
let locationRequest: Promise<Location.LocationObjectCoords | null> | null =
  null;

export function pollSessionLocation() {
  if (!locationRequest) {
    locationRequest = fetchSessionLocation();
  }
  return locationRequest;
}

async function fetchSessionLocation() {
  let keepErrorToastVisible = false;
  Toast.show({
    type: "info",
    text1: "Locating Stores",
    text2: "Fetching your precise location for accurate distances...",
    autoHide: false,
  });

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED) {
      keepErrorToastVisible = true;
      Toast.hide();
      Toast.show({
        type: "error",
        text1: "Permission Denied",
        text2: "Distance sorting disabled.",
      });
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    sessionLocation = location.coords;
    return sessionLocation;
  } catch {
    return null;
  } finally {
    if (!keepErrorToastVisible) Toast.hide();
  }
}

// Looks up the name of the place at some coordinates. Returns null if the phone can't say.
export async function lookupPlaceName(coords: Coords): Promise<string | null> {
  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
    return formatPlaceName(address);
  } catch {
    return null;
  }
}

// Where the phone last was, without asking for permission or showing any pop-up. Null if the
// phone has nothing cached.
export async function peekDeviceCoords(): Promise<Coords | null> {
  if (sessionLocation) return sessionLocation;
  try {
    const last = await Location.getLastKnownPositionAsync();
    return last?.coords ?? null;
  } catch {
    return null;
  }
}

export type DeviceLocationResult =
  | { ok: true; placeName: string | null }
  | { ok: false; reason: "denied" | "unavailable" };

// Stops using a typed-in ZIP code and goes back to the phone's own location. Asks for permission
// if needed, reads a fresh position, and finds the place name for it.
export async function switchToDeviceLocation(): Promise<DeviceLocationResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== Location.PermissionStatus.GRANTED)
      return { ok: false, reason: "denied" };
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    sessionLocation = position.coords;
    // Later readers of the session location get this fresh position, not an old failed lookup.
    locationRequest = Promise.resolve(sessionLocation);
    await clearManualLocation();
    return { ok: true, placeName: await lookupPlaceName(position.coords) };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

export async function getSessionLocation(): Promise<Coords> {
  if (manualLocation) return manualLocation;
  return sessionLocation ?? (await pollSessionLocation()) ?? DEFAULT_COORDS;
}
