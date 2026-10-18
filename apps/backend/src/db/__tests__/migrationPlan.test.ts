import { pendingMigrations } from "@/db/migrationPlan";

describe("pendingMigrations", () => {
  const all = ["002_b.sql", "001_a.sql", "003_c.sql", "notes.txt"];

  it("runs everything, in order, on a new database", () => {
    expect(pendingMigrations(all, [])).toEqual(["001_a.sql", "002_b.sql", "003_c.sql"]);
  });
  it("runs only what has not run yet", () => {
    expect(pendingMigrations(all, ["001_a.sql", "002_b.sql"])).toEqual(["003_c.sql"]);
  });
  it("runs nothing when up to date", () => {
    expect(pendingMigrations(all, ["001_a.sql", "002_b.sql", "003_c.sql"])).toEqual([]);
  });
  it("does not run a file twice just because it is out of order", () => {
    expect(pendingMigrations(all, ["002_b.sql"])).toEqual(["001_a.sql", "003_c.sql"]);
  });
});
