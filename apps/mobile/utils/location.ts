import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import Toast from "react-native-toast-message";

const ROUTING_PREF_KEY = "@nearcommerce_routing_pref";
const DEFAULT_COORDS = { latitude: 0, longitude: 0 };

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

export async function getSessionLocation() {
  return sessionLocation ?? (await pollSessionLocation()) ?? DEFAULT_COORDS;
}

export async function saveRoutingPreference(preference: "walking" | "driving") {
  await AsyncStorage.setItem(ROUTING_PREF_KEY, preference);
}

export async function getRoutingPreference(): Promise<"walking" | "driving"> {
  const preference = await AsyncStorage.getItem(ROUTING_PREF_KEY);
  return preference === "walking" ? "walking" : "driving";
}
