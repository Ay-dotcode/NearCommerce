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

const darkScales = { slate: darkSlate };
for (const name of Object.keys(lightScales)) {
  if (name !== "slate") darkScales[name] = flipAccent(lightScales[name]);
}

const light = { white: "#ffffff", ...lightScales };
const dark = { white: "#0f172a", ...darkScales };

// Colours that must not change with the theme (text on solid brand/danger fills, scrims).
const constants = { onbrand: "#ffffff", scrim: "#020617" };

module.exports = { light, dark, constants, SHADES };
