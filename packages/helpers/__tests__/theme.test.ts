import {
  DEFAULT_THEME_PREFERENCE,
  isThemePreference,
  parseThemePreference,
  THEME_LABELS,
  THEME_PREFERENCES,
} from "../src/theme";

describe("theme preference", () => {
  it("offers automatic, light and dark, and automatic is the default", () => {
    expect([...THEME_PREFERENCES]).toEqual(["system", "light", "dark"]);
    expect(DEFAULT_THEME_PREFERENCE).toBe("system");
    expect(THEME_LABELS.system).toBe("Auto");
  });

  it("accepts only known values", () => {
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("sepia")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it("falls back to automatic for anything missing or corrupt", () => {
    expect(parseThemePreference("light")).toBe("light");
    for (const bad of [null, undefined, "", "DARK", 3, {}])
      expect(parseThemePreference(bad)).toBe("system");
  });
});
