// Escapes LIKE wildcards so user input is matched literally (use with ESCAPE '\').
export const escapeLike = (value: string) =>
  value.replace(/[\\%_]/g, (char) => `\\${char}`);
