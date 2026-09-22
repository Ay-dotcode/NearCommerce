import { Linking, Platform } from "react-native";

export async function openNativeMaps(
  latitude: number,
  longitude: number,
  label: string,
) {
  const encodedLabel = encodeURIComponent(label);
  const url = Platform.select({
    ios: `maps://?ll=${latitude},${longitude}&q=${encodedLabel}`,
    android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`,
    default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
  });

  if (url && (await Linking.canOpenURL(url))) {
    await Linking.openURL(url);
  }
}
