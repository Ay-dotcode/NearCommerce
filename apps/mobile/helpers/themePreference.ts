import {
  DEFAULT_THEME_PREFERENCE,
  parseThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@nearcommerce/helpers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

// The shopper's theme choice: follow the device ("system"), or force light or dark. It is saved
// on the phone so it survives a restart. Forcing is done through Appearance, so every screen,
// the status bar and native pop-ups switch together; "system" hands control back to the phone.
let preference: ThemePreference = DEFAULT_THEME_PREFERENCE;
// Bumped on every change, so a slow load can't overwrite a newer choice.
let version = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const getThemePreference = () => preference;

export function subscribeThemePreference(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function applyThemePreference(value: ThemePreference) {
  try {
    Appearance.setColorScheme?.(value === "system" ? "unspecified" : value);
  } catch {
    // Not supported on this platform: the choice is still saved, the device setting applies.
  }
}

export async function loadThemePreference() {
  const startedAt = version;
  try {
    const raw = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (startedAt === version) preference = parseThemePreference(raw);
  } catch {
    if (startedAt === version) preference = DEFAULT_THEME_PREFERENCE;
  }
  applyThemePreference(preference);
  notify();
  return preference;
}

export async function setThemePreference(value: ThemePreference) {
  version++;
  preference = value;
  applyThemePreference(value);
  notify();
  await AsyncStorage.setItem(THEME_STORAGE_KEY, value);
}
