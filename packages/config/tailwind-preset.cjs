const plugin = require("tailwindcss/plugin");
const { constants, SHADES, themes } = require("./palette.cjs");

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

const brandGlow = (alpha) => `rgb(var(--c-brand-500) / ${alpha})`;

// Hover, glow, outline, press and entrance effects shared by every web app. They use the brand
// tokens, so each portal glows in its own colour. Hover effects only apply to devices that can
// hover, and all motion is switched off for people who ask for reduced motion.
const effects = {
  ".hover-glow": {
    transition: "box-shadow 0.2s ease, border-color 0.2s ease, transform 0.2s ease",
  },
  ".hover-outline": {
    transition: "box-shadow 0.15s ease, border-color 0.15s ease",
  },
  ".hover-lift": { transition: "transform 0.2s ease, box-shadow 0.2s ease" },
  ".press": { transition: "transform 0.12s ease" },
  "@media (hover: hover)": {
    ".hover-glow:hover": {
      borderColor: brandGlow(0.6),
      boxShadow: `0 0 0 1px ${brandGlow(0.35)}, 0 10px 34px -8px ${brandGlow(0.55)}`,
    },
    ".hover-outline:hover": {
      boxShadow: `0 0 0 2px ${brandGlow(0.65)}`,
    },
    ".hover-lift:hover": { transform: "translateY(-2px)" },
    // Underline that grows from the left (navigation links).
    ".hover-underline": {
      backgroundImage: "linear-gradient(currentColor, currentColor)",
      backgroundPosition: "0 100%",
      backgroundRepeat: "no-repeat",
      backgroundSize: "0 2px",
      transition: "background-size 0.25s ease",
    },
    ".hover-underline:hover": { backgroundSize: "100% 2px" },
  },
  ".press:active": { transform: "scale(0.97)" },
  "@media (prefers-reduced-motion: reduce)": {
    ".hover-lift:hover, .press:active": { transform: "none" },
  },
};

function createPreset(themeName = "default") {
  const theme = themes[themeName];
  if (!theme) throw new Error(`Unknown theme "${themeName}"`);
  const { light, dark } = theme;

  const colors = { white: ref("white"), ...constants };
  for (const [name, scale] of Object.entries(light)) {
    if (typeof scale === "string") colors[name] = ref(name);
    else
      colors[name] = Object.fromEntries(
        SHADES.map((shade) => [shade, ref(`${name}-${shade}`)]),
      );
  }

  // Shared Tailwind preset for the web and admin apps. Colour classes such as `bg-white`,
  // `text-slate-900` or `border-brand-200` resolve to CSS variables. Which palette is active:
  //   - the device/browser setting (automatic), unless
  //   - <html data-theme="light|dark"> forces one (set by the theme toggle).
  return {
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
          glow: `0 0 24px -4px ${brandGlow(0.55)}`,
        },
        keyframes: {
          "skeleton-shimmer": { "100%": { transform: "translateX(100%)" } },
          "overlay-in": { from: { opacity: "0" }, to: { opacity: "1" } },
          "sheet-in": {
            from: { opacity: "0", transform: "translateY(12px) scale(0.98)" },
            to: { opacity: "1", transform: "none" },
          },
          "drawer-in": {
            from: { transform: "translateX(-100%)" },
            to: { transform: "none" },
          },
          "fade-in-up": {
            from: { opacity: "0", transform: "translateY(10px)" },
            to: { opacity: "1", transform: "none" },
          },
          "pop-in": {
            "0%": { opacity: "0", transform: "scale(0.9)" },
            "70%": { transform: "scale(1.03)" },
            "100%": { opacity: "1", transform: "none" },
          },
          float: {
            "0%, 100%": { transform: "translate3d(0, 0, 0)" },
            "50%": { transform: "translate3d(0, -18px, 0)" },
          },
          drift: {
            "0%, 100%": { transform: "translate3d(0, 0, 0) scale(1)" },
            "33%": { transform: "translate3d(6%, -4%, 0) scale(1.08)" },
            "66%": { transform: "translate3d(-5%, 5%, 0) scale(0.95)" },
          },
          "pulse-glow": {
            "0%, 100%": { boxShadow: `0 0 0 0 ${brandGlow(0.5)}` },
            "50%": { boxShadow: `0 0 0 8px ${brandGlow(0)}` },
          },
          scan: {
            "0%": { transform: "translateY(-100%)" },
            "100%": { transform: "translateY(100vh)" },
          },
        },
        animation: {
          "skeleton-shimmer": "skeleton-shimmer 1.6s infinite",
          "overlay-in": "overlay-in 150ms ease-out",
          "sheet-in": "sheet-in 180ms ease-out",
          "drawer-in": "drawer-in 200ms ease-out",
          "fade-in-up": "fade-in-up 0.4s ease-out both",
          "pop-in": "pop-in 0.35s ease-out both",
          float: "float 7s ease-in-out infinite",
          drift: "drift 18s ease-in-out infinite",
          "pulse-glow": "pulse-glow 2.4s ease-in-out infinite",
          scan: "scan 9s linear infinite",
        },
      },
    },
    plugins: [
      plugin(({ addBase, addUtilities }) => {
        addBase({
          ":root": { ...cssVars(light), colorScheme: "light dark" },
          "@media (prefers-color-scheme: dark)": {
            ":root:not([data-theme='light'])": cssVars(dark),
          },
          ":root[data-theme='light']": { colorScheme: "light" },
          ":root[data-theme='dark']": { ...cssVars(dark), colorScheme: "dark" },
          "*, ::before, ::after": {
            "--tw-ring-offset-color": "rgb(var(--c-white))",
          },
          body: {
            margin: "0",
            backgroundColor: "rgb(var(--c-slate-50))",
            color: "rgb(var(--c-slate-900))",
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*, ::before, ::after": {
              animationDuration: "0.01ms !important",
              animationIterationCount: "1 !important",
              transitionDuration: "0.01ms !important",
            },
          },
        });
        addUtilities(effects);
      }),
    ],
  };
}

// The default (shopper blue) theme stays the module's own value; apps ask for theirs with
// createPreset("owner") or createPreset("admin").
module.exports = createPreset("default");
module.exports.createPreset = createPreset;
