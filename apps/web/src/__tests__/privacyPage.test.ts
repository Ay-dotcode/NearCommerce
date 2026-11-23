import { THEME_STORAGE_KEY } from "@nearcommerce/helpers";
import fs from "fs";
import path from "path";

// privacy.html is static (nothing type-checks it), so these guard what could silently drift.
const html = fs.readFileSync(
  path.join(__dirname, "../../public/privacy.html"),
  "utf8",
);

describe("public/privacy.html", () => {
  it("reads the same theme key the portal's theme toggle saves", () => {
    expect(html).toContain(`localStorage.getItem("${THEME_STORAGE_KEY}")`);
  });

  it("follows both a saved Light/Dark choice and the device setting", () => {
    expect(html).toContain(':root[data-theme="dark"]');
    expect(html).toContain("@media (prefers-color-scheme: dark)");
    expect(html).toContain(':root:not([data-theme="light"])');
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
  });

  it("makes no third-party requests (fonts, scripts, styles)", () => {
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toMatch(/<link[^>]+rel="stylesheet"/i);
  });

  it("uses the app's logo and links back to the portal", () => {
    expect(html).toContain('src="/icon.svg"');
    expect(html).toContain('href="/"');
  });
});
