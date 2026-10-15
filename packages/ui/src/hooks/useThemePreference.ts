import {
  applyTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
} from "@nearcommerce/ui/src/helpers/theme";
import {
  parseThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@nearcommerce/helpers";
import { useCallback, useEffect, useState } from "react";

// The visitor's theme choice (automatic, light or dark). It is applied to the page and saved in
// the browser, so it survives a refresh; other open tabs follow along.
export function useThemePreference() {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readStoredTheme);
  const [resolved, setResolved] = useState(() => resolveTheme(preference));

  useEffect(() => {
    applyTheme(preference);
    setResolved(resolveTheme(preference));
  }, [preference]);

  // "Auto" tracks the device while the page is open (for example at sunset).
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const onChange = () => setResolved(resolveTheme(preference));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY)
        setPreferenceState(parseThemePreference(e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    storeTheme(next);
    setPreferenceState(next);
  }, []);

  return { preference, resolved, setPreference };
}
