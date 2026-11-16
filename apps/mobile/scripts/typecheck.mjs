// Runs the TypeScript compiler and fails only for errors in this project's own files.
// react-native-safe-area-context ships .tsx sources whose types currently disagree with the
// React types, and skipLibCheck does not apply to source files, so those node_modules errors
// are ignored here. Remove this wrapper (use plain `tsc --noEmit`) once that is fixed upstream.
import { spawnSync } from "node:child_process";

const result = spawnSync("pnpm", ["exec", "tsc", "--noEmit", "--pretty", "false"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
const lines = output.split("\n");

const own = [];
const external = [];
let current = null;
for (const line of lines) {
  if (/^\S.*\(\d+,\d+\): error TS\d+/.test(line)) {
    current = line.includes("node_modules") ? external : own;
    current.push(line);
  } else if (/^\s/.test(line) && current) {
    current.push(line);
  } else if (line.trim()) {
    current = null;
    own.push(line); // anything unexpected (config problems, crashes) must not be hidden
  }
}

if (own.length) {
  console.error(own.join("\n"));
  process.exit(1);
}
const skipped = external.filter((l) => /error TS\d+/.test(l)).length;
if (skipped)
  console.log(
    `Type-check passed (${skipped} errors inside node_modules ignored).`,
  );
else console.log("Type-check passed.");
