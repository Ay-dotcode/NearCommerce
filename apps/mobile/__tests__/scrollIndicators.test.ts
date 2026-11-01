import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

// Android flashes a scrollbar for a moment when a scrollable first lays out (when a screen opens
// or its data arrives). Every scrollable in the app has its indicator turned off; this keeps a
// newly added one from bringing the flash back.
const ROOT = join(__dirname, "..");
const DIRS = ["app", "components", "forms", "src"];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return name === "node_modules" || name === "__tests__"
        ? []
        : sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

// The opening tag of every <ScrollView> / <FlatList> / <SectionList> in a file.
function scrollableTags(source: string): string[] {
  const tags: string[] = [];
  const open = /<(ScrollView|FlatList|SectionList)(?=[\s>])/g;
  for (let m = open.exec(source); m; m = open.exec(source)) {
    // `useRef<ScrollView>(...)` is a type argument, not a view.
    if (/[A-Za-z0-9_]/.test(source[m.index - 1] ?? "")) continue;
    // The tag ends at the first ">" outside of braces (props can hold arrow functions).
    let depth = 0;
    let end = m.index;
    for (; end < source.length; end++) {
      const ch = source[end];
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      else if (ch === ">" && depth === 0 && source[end - 1] !== "=") break;
    }
    tags.push(source.slice(m.index, end + 1));
  }
  return tags;
}

describe("scroll indicators", () => {
  const files = DIRS.flatMap((d) => sourceFiles(join(ROOT, d)));

  it("finds the app's scrollable views (so this test can't pass by checking nothing)", () => {
    const count = files.reduce(
      (n, f) => n + scrollableTags(readFileSync(f, "utf8")).length,
      0,
    );
    expect(count).toBeGreaterThanOrEqual(10);
  });

  it("hides the scroll indicator on every scrollable", () => {
    const offenders: string[] = [];
    for (const file of files)
      for (const tag of scrollableTags(readFileSync(file, "utf8"))) {
        const horizontal = /\bhorizontal\b/.test(tag);
        const prop = horizontal
          ? "showsHorizontalScrollIndicator={false}"
          : "showsVerticalScrollIndicator={false}";
        if (!tag.includes(prop))
          offenders.push(`${file.replace(ROOT + "/", "")}: ${tag.split("\n")[0]}`);
      }
    expect(offenders).toEqual([]);
  });
});
