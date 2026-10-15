// Single source of truth for NearCommerce colours. The Tailwind preset (web + admin) and the
// mobile theme both read from here, so light and dark mode stay identical across all apps.
// Each scale has a `light` and a `dark` value per shade; screens are written light-first and the
// dark values are swapped in automatically when the device/browser asks for a dark appearance.

const lightScales = {
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
  brand: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
  red: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a",
  },
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    950: "#022c22",
  },
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },
  yellow: {
    50: "#fefce8",
    100: "#fef9c3",
    200: "#fef08a",
    300: "#fde047",
    400: "#facc15",
    500: "#eab308",
    600: "#ca8a04",
    700: "#a16207",
    800: "#854d0e",
    900: "#713f12",
    950: "#422006",
  },
};

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Extra brand colours for the portals that have their own look.
const teal = {
  50: "#f0fdfa",
  100: "#ccfbf1",
  200: "#99f6e4",
  300: "#5eead4",
  400: "#2dd4bf",
  500: "#14b8a6",
  600: "#0d9488",
  700: "#0f766e",
  800: "#115e59",
  900: "#134e4a",
  950: "#042f2e",
};
const violet = {
  50: "#f5f3ff",
  100: "#ede9fe",
  200: "#ddd6fe",
  300: "#c4b5fd",
  400: "#a78bfa",
  500: "#8b5cf6",
  600: "#7c3aed",
  700: "#6d28d9",
  800: "#5b21b6",
  900: "#4c1d95",
  950: "#2e1065",
};
// Teal-600 is too light for white text, so the owner brand starts one step darker.
const tealBrand = {
  50: teal[50],
  100: teal[100],
  200: teal[200],
  300: teal[300],
  400: teal[400],
  500: teal[600],
  600: teal[700],
  700: teal[800],
  800: teal[900],
  900: teal[950],
  950: teal[950],
};

// Neutral scale is tuned by hand so surfaces, borders and text keep readable contrast on dark.
const darkSlate = {
  50: "#0b1120",
  100: "#172033",
  200: "#1e293b",
  300: "#334155",
  400: "#64748b",
  500: "#94a3b8",
  600: "#b6c3d4",
  700: "#cbd5e1",
  800: "#e2e8f0",
  900: "#f1f5f9",
  950: "#f8fafc",
};

// Accent scales: light tints (50-300) become deep tints and the dark text shades (700-900)
// become light, while the saturated middle (400-600) used for fills stays put.
const flipAccent = (scale) => ({
  50: scale[950],
  100: scale[900],
  200: scale[800],
  300: scale[700],
  400: scale[400],
  500: scale[500],
  600: scale[600],
  700: scale[300],
  800: scale[200],
  900: scale[100],
  950: scale[50],
});

// Colours that must not change with the theme (text on solid brand/danger fills, scrims).
const constants = { onbrand: "#ffffff", scrim: "#020617" };

// One theme per product. Everything but the brand colour is shared, so the apps feel related
// but each portal is recognisable: shoppers (blue), store owners (teal), admins (violet).
function makeTheme(brand) {
  const scales = { ...lightScales, brand };
  const darkScales = { slate: darkSlate };
  for (const name of Object.keys(scales)) {
    if (name !== "slate") darkScales[name] = flipAccent(scales[name]);
  }
  return {
    // `shimmer` is the moving highlight on skeleton placeholders.
    light: { white: "#ffffff", shimmer: "#ffffff", ...scales },
    dark: { white: "#0f172a", shimmer: "#64748b", ...darkScales },
  };
}

const themes = {
  default: makeTheme(lightScales.brand),
  owner: makeTheme(tealBrand),
  admin: makeTheme(violet),
};

const { light, dark } = themes.default;

module.exports = { light, dark, themes, constants, SHADES };
