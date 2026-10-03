// Joins class names, skipping falsy values.
export const cn = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");
