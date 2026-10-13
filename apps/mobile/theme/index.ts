import {
  constants,
  dark,
  light,
  type Palette,
} from "@nearcommerce/config/palette";
import { useMemo } from "react";
import { useColorScheme } from "react-native";

// Semantic colours for the app. Both appearances come from the shared palette in
// packages/config (the same one the web and admin apps use), so light and dark mode match
// everywhere. Screens never use hex values; they read these names.
const buildColors = (p: Palette) => ({
  background: p.slate[50],
  surface: p.white,
  surfaceAlt: p.slate[100],
  border: p.slate[200],
  borderStrong: p.slate[300],
  skeleton: p.slate[200],

  text: p.slate[900],
  textSecondary: p.slate[600],
  textMuted: p.slate[500],
  placeholder: p.slate[400],

  primary: p.brand[600],
  primarySoft: p.brand[100],
  primaryText: p.brand[700],
  onPrimary: constants.onbrand,

  danger: p.red[700],
  dangerSoft: p.red[100],
  dangerText: p.red[800],
  dangerBorder: p.red[300],
  heart: p.red[500],

  success: p.emerald[500],
  successSoft: p.emerald[100],
  successText: p.emerald[800],

  warning: p.amber[700],
  warningStrong: p.amber[500],
  warningSoft: p.amber[50],
  warningBorder: p.amber[300],
  warningText: p.amber[900],
  star: p.yellow[500],

  scrim: constants.scrim,
  shadow: p.slate[900],
});

export type ThemeColors = ReturnType<typeof buildColors>;

export interface Theme {
  isDark: boolean;
  colors: ThemeColors;
}

export const lightTheme: Theme = { isDark: false, colors: buildColors(light) };
export const darkTheme: Theme = { isDark: true, colors: buildColors(dark) };

// The current theme. Follows the device appearance and updates live when it changes.
export function useTheme(): Theme {
  return useColorScheme() === "dark" ? darkTheme : lightTheme;
}

export const useColors = (): ThemeColors => useTheme().colors;

// Builds a StyleSheet from the current colours. The sheet is rebuilt only when the appearance
// changes, so screens keep plain `StyleSheet.create` code inside a `makeStyles(c)` function.
export function useThemedStyles<T>(make: (colors: ThemeColors) => T): T {
  const colors = useColors();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => make(colors), [colors]);
}
