// The command palette's data and search. Kept free of React so it is easy to test.

export interface PaletteCommand {
  id: string;
  label: string;
  // Extra words that also match (for example "logout" for "Sign out").
  keywords?: string[];
  // Short text shown on the right, e.g. "Go to" or "Action".
  group: string;
  run: () => void;
}

// Every typed word must appear in the label, a keyword or the group; no words shows everything.
export function filterCommands(
  commands: PaletteCommand[],
  query: string,
): PaletteCommand[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return commands;
  return commands.filter((command) => {
    const haystack = [command.label, command.group, ...(command.keywords ?? [])]
      .join(" ")
      .toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

// Ctrl+K (Windows/Linux) or Cmd+K (Mac).
export const isPaletteShortcut = (e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
}) => (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";

// Keeps the highlighted row inside the list as the arrow keys wrap around.
export const stepIndex = (current: number, delta: 1 | -1, count: number) =>
  count === 0 ? 0 : (current + delta + count) % count;
