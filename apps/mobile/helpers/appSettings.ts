import { Linking } from "react-native";

// Opens this app's page in the phone's Settings, where a refused permission (location, camera,
// notifications) can be switched on again. Never throws: some phones can't open it.
export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // Nothing else to try; the message next to the button already says where to go.
  }
}
