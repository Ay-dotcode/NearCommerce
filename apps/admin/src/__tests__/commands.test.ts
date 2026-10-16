import {
  filterCommands,
  isPaletteShortcut,
  stepIndex,
  type PaletteCommand,
} from "@/helpers/commands";

const cmd = (
  label: string,
  extra: Partial<PaletteCommand> = {},
): PaletteCommand => ({
  id: label,
  label,
  group: "Go to",
  run: () => {},
  ...extra,
});
const all = [
  cmd("Users"),
  cmd("Stores"),
  cmd("Audit ledger"),
  cmd("Sign out", { group: "Action", keywords: ["logout"] }),
];

describe("filterCommands", () => {
  it("shows everything for an empty query", () => {
    expect(filterCommands(all, "  ")).toHaveLength(4);
  });
  it("matches letters in any case", () => {
    expect(filterCommands(all, "USER").map((c) => c.label)).toEqual(["Users"]);
  });
  it("matches keywords and group names", () => {
    expect(filterCommands(all, "logout").map((c) => c.label)).toEqual([
      "Sign out",
    ]);
    expect(filterCommands(all, "action").map((c) => c.label)).toEqual([
      "Sign out",
    ]);
  });
  it("needs every typed word to match", () => {
    expect(filterCommands(all, "audit led")).toHaveLength(1);
    expect(filterCommands(all, "audit users")).toHaveLength(0);
  });
});

describe("isPaletteShortcut", () => {
  it("accepts Ctrl+K and Cmd+K only", () => {
    expect(isPaletteShortcut({ key: "k", ctrlKey: true, metaKey: false })).toBe(
      true,
    );
    expect(isPaletteShortcut({ key: "K", ctrlKey: false, metaKey: true })).toBe(
      true,
    );
    expect(
      isPaletteShortcut({ key: "k", ctrlKey: false, metaKey: false }),
    ).toBe(false);
    expect(isPaletteShortcut({ key: "j", ctrlKey: true, metaKey: false })).toBe(
      false,
    );
  });
});

describe("stepIndex", () => {
  it("wraps around the list", () => {
    expect(stepIndex(0, -1, 3)).toBe(2);
    expect(stepIndex(2, 1, 3)).toBe(0);
    expect(stepIndex(0, 1, 0)).toBe(0);
  });
});
