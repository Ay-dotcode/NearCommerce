import {
  parseThemePreference,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@nearcommerce/helpers";

// Browser side of the theme preference. "system" leaves the page alone so the CSS follows the
// device or browser setting; "light" and "dark" set <html data-theme> to force one.

export function readStoredTheme(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    // Storage can be blocked (private mode); automatic is the safe default.
    return "system";
  }
}

export function storeTheme(preference: ThemePreference) {
  try {
    if (preference === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // The choice still applies for this visit even if it cannot be saved.
  }
}

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") delete root.dataset.theme;
  else root.dataset.theme = preference;
}

// What the page is showing right now: the forced choice, or the device's own setting.
export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference !== "system") return preference;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
