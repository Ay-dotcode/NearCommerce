import { AVOID_TOLLS_KEY } from "@/constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";

// Builds the native-maps deep link for a store. Android's Google Maps navigation intent and
// the web fallback honour "avoid tolls"; Apple Maps has no such option, so iOS ignores it.
export function buildMapsUrl(
  latitude: number,
  longitude: number,
  label: string,
  avoidTolls = false,
) {
  const encodedLabel = encodeURIComponent(label);
  return Platform.select({
    ios: `maps://?daddr=${latitude},${longitude}&q=${encodedLabel}`,
    android: avoidTolls
      ? `google.navigation:q=${latitude},${longitude}&avoid=t`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`,
    default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}${avoidTolls ? "&avoid=tolls" : ""}`,
  });
}

// The https directions link. Every phone can open it: the Maps app takes it if there is one,
// the browser otherwise.
export function buildWebMapsUrl(
  latitude: number,
  longitude: number,
  avoidTolls = false,
) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}${avoidTolls ? "&avoid=tolls" : ""}`;
}

// Hands off to the phone's maps app. Returns false only when nothing at all could open it.
//
// Do not gate this on Linking.canOpenURL: since Android 11 (package visibility) and on iOS
// without LSApplicationQueriesSchemes it answers false for geo: / google.navigation: / maps:
// links even when a maps app is installed, which made release builds report "no maps app
// available". Just try to open, and fall back to the https link if that fails.
export async function openNativeMaps(
  latitude: number,
  longitude: number,
  label: string,
): Promise<boolean> {
  const avoidTolls = (await AsyncStorage.getItem(AVOID_TOLLS_KEY)) === "true";
  const candidates = [
    buildMapsUrl(latitude, longitude, label, avoidTolls),
    buildWebMapsUrl(latitude, longitude, avoidTolls),
  ].filter((url, index, all): url is string => !!url && all.indexOf(url) === index);

  for (const url of candidates) {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      // No app handles this link: try the next one.
    }
  }
  return false;
}
