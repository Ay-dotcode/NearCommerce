const test = require("node:test");
const assert = require("node:assert/strict");
const {
  light,
  dark,
  constants,
  SHADES,
} = require("@nearcommerce/config/palette");
const preset = require("@nearcommerce/config/tailwind-preset");

const HEX = /^#[0-9a-f]{6}$/i;
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("light and dark palettes define the same colours, all valid hex", () => {
  assert.deepEqual(Object.keys(dark).sort(), Object.keys(light).sort());
  for (const palette of [light, dark])
    for (const [name, value] of Object.entries(palette)) {
      if (typeof value === "string") assert.match(value, HEX, name);
      else
        for (const shade of SHADES)
          assert.match(value[shade], HEX, `${name}-${shade}`);
    }
});

test("dark mode really is dark: the page and surfaces flip", () => {
  assert.ok(luminance(light.slate[50]) > 0.9);
  assert.ok(luminance(dark.slate[50]) < 0.05);
  assert.ok(luminance(light.white) > 0.9);
  assert.ok(luminance(dark.white) < 0.05);
  assert.ok(luminance(dark.slate[900]) > 0.8, "headings become light");
});

for (const [name, p] of [
  ["light", light],
  ["dark", dark],
]) {
  test(`text stays readable on ${name} surfaces (WCAG AA)`, () => {
    assert.ok(contrast(p.slate[900], p.white) >= 4.5);
    assert.ok(contrast(p.slate[900], p.slate[50]) >= 4.5);
    assert.ok(contrast(p.slate[600], p.white) >= 4.5);
    assert.ok(contrast(p.slate[500], p.white) >= 3);
    assert.ok(contrast(constants.onbrand, p.brand[600]) >= 4.5);
    assert.ok(contrast(p.brand[800], p.brand[50]) >= 4.5);
    assert.ok(contrast(p.red[800], p.red[50]) >= 4.5);
    assert.ok(contrast(p.emerald[800], p.emerald[50]) >= 4.5);
    assert.ok(contrast(p.amber[800], p.amber[50]) >= 4.5);
  });
}

test("the preset maps Tailwind colours to CSS variables (so classes switch with the theme)", () => {
  const { colors } = preset.theme;
  assert.equal(colors.white, "rgb(var(--c-white) / <alpha-value>)");
  assert.equal(colors.slate[900], "rgb(var(--c-slate-900) / <alpha-value>)");
  assert.equal(colors.brand[600], "rgb(var(--c-brand-600) / <alpha-value>)");
  // Text on solid brand fills and the scrim must not change with the theme.
  assert.equal(colors.onbrand, "#ffffff");
  assert.equal(colors.scrim, constants.scrim);
});

test("the preset emits light variables by default and dark ones under prefers-color-scheme", () => {
  let base;
  const plugin = preset.plugins[0];
  const handler = plugin.handler ?? plugin;
  (typeof handler === "function" ? handler : plugin.handler)({
    addBase: (rules) => (base = rules),
  });
  assert.equal(base[":root"]["--c-white"], "255 255 255");
  assert.equal(base[":root"].colorScheme, "light dark");
  const darkRoot = base["@media (prefers-color-scheme: dark)"][":root"];
  assert.equal(darkRoot["--c-white"], "15 23 42");
  assert.notEqual(darkRoot["--c-slate-900"], base[":root"]["--c-slate-900"]);
  assert.ok(base.body.backgroundColor.includes("--c-slate-50"));
});
