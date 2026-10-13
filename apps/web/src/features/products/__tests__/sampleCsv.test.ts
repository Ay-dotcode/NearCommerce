import { recordsToProducts } from "@/features/products/lib/csv";
import Papa from "papaparse";
import { readFileSync } from "node:fs";
import path from "node:path";

// The sample file shipped in /samples must always be importable as-is.
const file = readFileSync(
  path.resolve(process.cwd(), "../../samples/nearcommerce-sample-products.csv"),
  "utf8",
);

describe("samples/nearcommerce-sample-products.csv", () => {
  const parsed = Papa.parse<Record<string, string>>(file, {
    header: true,
    skipEmptyLines: "greedy",
  });
  const result = recordsToProducts(parsed.data, parsed.meta.fields ?? []);

  it("passes every importer rule with no problems", () => {
    expect(result.issues).toEqual([]);
    expect(result.rows.length).toBe(parsed.data.length);
  });

  it("is a realistic shop: dozens of products with both published items and drafts", () => {
    expect(result.rows.length).toBeGreaterThanOrEqual(30);
    expect(result.rows.filter((r) => r.is_published).length).toBeGreaterThan(
      20,
    );
    expect(
      result.rows.filter((r) => !r.is_published).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("includes out-of-stock items and names with commas (proper CSV quoting)", () => {
    expect(result.rows.some((r) => r.quantity === 0)).toBe(true);
    expect(result.rows.some((r) => r.name.includes(","))).toBe(true);
  });

  it("has no duplicate product names (an import matches existing products by name)", () => {
    const names = result.rows.map((r) => r.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });
});
