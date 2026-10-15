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

// Hands off to the phone's maps app. Returns false when no app could open the link.
export async function openNativeMaps(
  latitude: number,
  longitude: number,
  label: string,
): Promise<boolean> {
  const avoidTolls = (await AsyncStorage.getItem(AVOID_TOLLS_KEY)) === "true";
  const url = buildMapsUrl(latitude, longitude, label, avoidTolls);
  if (!url || !(await Linking.canOpenURL(url))) return false;
  await Linking.openURL(url);
  return true;
}
