// Which migration files still need to run. Pure, so it can be tested without a database.
export function pendingMigrations(allFiles: string[], applied: string[]): string[] {
  const done = new Set(applied);
  return allFiles
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .filter((file) => !done.has(file));
}
