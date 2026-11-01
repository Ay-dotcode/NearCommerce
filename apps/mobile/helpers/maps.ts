import { Linking, Platform } from "react-native";

// Directions always go to the store's saved coordinates (the latitude / longitude stored in our
// own database), never to a place looked up by name. The store's name is deliberately not part of
// any link: a name makes Google / Apple Maps search for a business, which finds the wrong place
// or nothing at all when the shop isn't listed there.

// The https directions link. Every phone can open it: the Maps app takes it if there is one, the
// browser otherwise. A plain coordinate pair is a point on the map, not a search.
export function buildWebMapsUrl(latitude: number, longitude: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
}

// Android's Google Maps navigation intent: routes to the coordinates.
export function buildNavigationUrl(latitude: number, longitude: number) {
  return `google.navigation:q=${latitude},${longitude}`;
}

// A pin at the coordinates, handled by whichever maps app the phone has (Google Maps, Waze, ...).
export function buildGeoUrl(latitude: number, longitude: number) {
  return `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
}

// Apple Maps directions to the coordinates.
export function buildAppleMapsUrl(latitude: number, longitude: number) {
  return `maps://?daddr=${latitude},${longitude}&dirflg=d`;
}

// The first link to try on this platform: the one that opens a maps app straight into directions.
export function buildMapsUrl(latitude: number, longitude: number) {
  return Platform.select({
    ios: buildAppleMapsUrl(latitude, longitude),
    android: buildNavigationUrl(latitude, longitude),
    default: buildWebMapsUrl(latitude, longitude),
  });
}

// Every link worth trying, best first: an installed maps app, then any app that handles a pin,
// then the web link (which still works with no maps app installed).
export function buildMapsCandidates(
  latitude: number,
  longitude: number,
): string[] {
  const web = buildWebMapsUrl(latitude, longitude);
  const candidates = Platform.select<string[]>({
    ios: [buildAppleMapsUrl(latitude, longitude), web],
    android: [
      buildNavigationUrl(latitude, longitude),
      buildGeoUrl(latitude, longitude),
      web,
    ],
    default: [web],
  });
  return candidates ?? [web];
}

// Hands off to the phone's maps app. Returns false only when nothing at all could open it.
//
// Do not gate this on Linking.canOpenURL: since Android 11 (package visibility) and on iOS
// without LSApplicationQueriesSchemes it answers false for geo: / google.navigation: / maps:
// links even when a maps app is installed, which made release builds report "no maps app
// available". Just try to open each link in turn.
export async function openNativeMaps(
  latitude: number,
  longitude: number,
): Promise<boolean> {
  for (const url of buildMapsCandidates(latitude, longitude)) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // No app handles this link: try the next one.
    }
  }
  return false;
}
