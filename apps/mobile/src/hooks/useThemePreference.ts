import {
  getThemePreference,
  loadThemePreference,
  setThemePreference,
  subscribeThemePreference,
} from "@/helpers/themePreference";
import { useEffect, useSyncExternalStore } from "react";

// The saved theme choice (Auto / Light / Dark). Loads it from the phone on first use.
export function useThemePreference() {
  const preference = useSyncExternalStore(
    subscribeThemePreference,
    getThemePreference,
    getThemePreference,
  );
  useEffect(() => {
    void loadThemePreference();
  }, []);
  return { preference, setPreference: setThemePreference };
}
