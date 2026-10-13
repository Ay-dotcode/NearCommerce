const plugin = require("tailwindcss/plugin");
const { light, dark, constants, SHADES } = require("./palette.cjs");

const hexToTriplet = (hex) => {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ");
};

const cssVars = (palette) => {
  const vars = {};
  for (const [name, value] of Object.entries(palette)) {
    if (typeof value === "string") vars[`--c-${name}`] = hexToTriplet(value);
    else
      for (const shade of SHADES)
        vars[`--c-${name}-${shade}`] = hexToTriplet(value[shade]);
  }
  return vars;
};

const ref = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

const colors = { white: ref("white"), ...constants };
for (const [name, scale] of Object.entries(light)) {
  if (typeof scale === "string") continue;
  colors[name] = Object.fromEntries(
    SHADES.map((shade) => [shade, ref(`${name}-${shade}`)]),
  );
}

// Shared Tailwind preset for the web and admin apps. Colour classes such as `bg-white`,
// `text-slate-900` or `border-brand-200` resolve to CSS variables that switch between the
// light and dark palettes with the device/browser `prefers-color-scheme` setting.
module.exports = {
  theme: {
    colors: {
      inherit: "inherit",
      current: "currentColor",
      transparent: "transparent",
      ...colors,
    },
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
        overlay: "0 20px 40px -12px rgb(2 6 23 / 0.35)",
      },
      keyframes: {
        "skeleton-shimmer": {
          "100%": { transform: "translateX(100%)" },
        },
        "overlay-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "sheet-in": {
          from: { opacity: "0", transform: "translateY(12px) scale(0.98)" },
          to: { opacity: "1", transform: "none" },
        },
        "drawer-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "none" },
        },
      },
      animation: {
        "skeleton-shimmer": "skeleton-shimmer 1.6s infinite",
        "overlay-in": "overlay-in 150ms ease-out",
        "sheet-in": "sheet-in 180ms ease-out",
        "drawer-in": "drawer-in 200ms ease-out",
      },
    },
  },
  plugins: [
    plugin(({ addBase }) => {
      addBase({
        ":root": { ...cssVars(light), colorScheme: "light dark" },
        "@media (prefers-color-scheme: dark)": { ":root": cssVars(dark) },
        "*, ::before, ::after": {
          "--tw-ring-offset-color": "rgb(var(--c-white))",
        },
        body: {
          margin: "0",
          backgroundColor: "rgb(var(--c-slate-50))",
          color: "rgb(var(--c-slate-900))",
        },
      });
    }),
  ],
};
