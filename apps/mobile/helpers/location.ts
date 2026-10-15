import { POSTAL_CODE_PATTERN } from "@/constants";
import type { Coords, ManualLocation } from "@/types/location";
import { PostalCodeError } from "@/types/location";
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

export async function getSessionLocation(): Promise<Coords> {
  if (manualLocation) return manualLocation;
  return sessionLocation ?? (await pollSessionLocation()) ?? DEFAULT_COORDS;
}
