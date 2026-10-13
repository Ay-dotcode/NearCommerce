// Renders the single brand icon (public/icon.svg) into the PNGs the mobile app needs.
// Run with: pnpm --filter @nearcommerce/ui generate:app-icons
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = await readFile(path.join(here, "../public/icon.svg"), "utf8");
const out = path.resolve(here, "../../../apps/mobile/assets");
await mkdir(out, { recursive: true });

// The artwork without its rounded blue square, centred inside the Android "safe zone".
const glyph = source.replace(/<rect[^>]*\/>/, "");
const foreground = `<svg width="1024" height="1024" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(256 256) scale(0.62) translate(-256 -256)">${glyph.replace(
    /<\/?svg[^>]*>/g,
    "",
  )}</g></svg>`;

const render = (svg, size, file, background) =>
  sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size)
    .flatten(background ? { background } : false)
    .png()
    .toFile(path.join(out, file));

// iOS / generic icon: full-bleed square (the OS rounds the corners).
const square = source.replace(/rx="\d+"/, 'rx="0"');
await render(square, 1024, "icon.png");
// In-app logo (keeps the rounded corners).
await render(source, 256, "logo.png");
// Android adaptive icon: transparent foreground on the brand-blue background colour.
await render(foreground, 1024, "adaptive-icon.png");
// Splash screen: white glyph on transparent (blue background colour is set in app.json).
await render(foreground, 512, "splash-icon.png");
await render(source, 48, "favicon.png");
console.log("Wrote app icons to", out);
