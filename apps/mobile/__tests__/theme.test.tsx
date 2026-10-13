import {
  dark as darkPalette,
  light as lightPalette,
} from "@nearcommerce/config/palette";
import { renderHook } from "@testing-library/react-native";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme, useColors, useTheme } from "@/theme";

jest.mock("react-native/Libraries/Utilities/useColorScheme", () => ({
  __esModule: true,
  default: jest.fn(() => "light"),
}));
const scheme = useColorScheme as unknown as jest.Mock;

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("theme follows the device appearance", () => {
  it("uses the light theme for a light device and the dark theme for a dark one", () => {
    scheme.mockReturnValue("light");
    expect(renderHook(() => useTheme()).result.current).toBe(lightTheme);
    scheme.mockReturnValue("dark");
    expect(renderHook(() => useTheme()).result.current).toBe(darkTheme);
    expect(renderHook(() => useColors()).result.current.background).toBe(
      darkTheme.colors.background,
    );
  });

  it("falls back to light when the device reports no preference", () => {
    scheme.mockReturnValue(null);
    expect(renderHook(() => useTheme()).result.current.isDark).toBe(false);
  });

  it("updates when the device appearance changes while the app is open", () => {
    scheme.mockReturnValue("light");
    const { result, rerender } = renderHook(() => useTheme());
    expect(result.current.isDark).toBe(false);
    scheme.mockReturnValue("dark");
    rerender({});
    expect(result.current.isDark).toBe(true);
  });
});

describe("theme colours", () => {
  it("come from the shared palette, so they match the web and admin apps", () => {
    expect(lightTheme.colors.background).toBe(lightPalette.slate[50]);
    expect(lightTheme.colors.surface).toBe(lightPalette.white);
    expect(lightTheme.colors.primary).toBe(lightPalette.brand[600]);
    expect(darkTheme.colors.background).toBe(darkPalette.slate[50]);
    expect(darkTheme.colors.surface).toBe(darkPalette.white);
  });

  it("are valid hex colours in both appearances, and differ between them", () => {
    for (const theme of [lightTheme, darkTheme])
      for (const [name, value] of Object.entries(theme.colors))
        (expect(value).toMatch(/^#[0-9a-f]{6}$/i), name);
    expect(darkTheme.colors.background).not.toBe(lightTheme.colors.background);
    expect(darkTheme.colors.text).not.toBe(lightTheme.colors.text);
  });

  it.each([
    ["light", lightTheme],
    ["dark", darkTheme],
  ])("keep text readable (WCAG AA) in %s mode", (_name, { colors: c }) => {
    expect(contrast(c.text, c.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.text, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.textSecondary, c.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.textMuted, c.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(c.onPrimary, c.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.dangerText, c.dangerSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.successText, c.successSoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.primaryText, c.primarySoft)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.danger, c.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
