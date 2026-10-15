// The theme preference every app offers: follow the device ("system") or force light or dark.
// Parsing and cycling live here so web, admin and mobile agree on the values; applying the
// choice (CSS attribute, native appearance) is platform specific and lives in each app.

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

// Where web (localStorage) and mobile (AsyncStorage) remember the choice.
export const THEME_STORAGE_KEY = "nearcommerce-theme";

export const THEME_LABELS: Record<ThemePreference, string> = {
  system: "Auto",
  light: "Light",
  dark: "Dark",
};

export const isThemePreference = (value: unknown): value is ThemePreference =>
  typeof value === "string" &&
  (THEME_PREFERENCES as readonly string[]).includes(value);

// Anything unrecognised (missing, corrupt, from an old version) falls back to automatic.
export const parseThemePreference = (value: unknown): ThemePreference =>
  isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
