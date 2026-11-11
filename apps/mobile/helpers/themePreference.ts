import {
  DEFAULT_THEME_PREFERENCE,
  parseThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@nearcommerce/helpers";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";

let preference: ThemePreference = DEFAULT_THEME_PREFERENCE;
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
  } catch {}
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
