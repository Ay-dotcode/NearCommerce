import { DarkTheme, DefaultTheme, type Theme as NavTheme } from "expo-router";
import { darkTheme, lightTheme, type Theme } from "./index";

// Colours for the navigation chrome (headers, tab bar, screen backgrounds).
export function navigationTheme(theme: Theme): NavTheme {
  const base = theme.isDark ? DarkTheme : DefaultTheme;
  const c = theme.colors;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.heart,
    },
  };
}

export { darkTheme, lightTheme };
