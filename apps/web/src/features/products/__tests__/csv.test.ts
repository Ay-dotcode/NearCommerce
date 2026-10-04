import {
  CSV_MAX_ROWS,
  CSV_TEMPLATE,
  normaliseHeader,
  parseProductCsv,
  recordsToProducts,
} from "@/features/products/lib/csv";

const COLUMNS = ["name", "description", "price", "quantity", "image_url"];
const good = {
  name: "Whole Milk",
  description: "Fresh",
  price: "2.49",
  quantity: "40",
  image_url: "https://example.com/milk.jpg",
};

describe("normaliseHeader", () => {
  it.each([
    ["Name", "name"],
    ["  Image URL ", "image_url"],
    ["image-url", "image_url"],
    ["﻿name", "name"],
    ["Qty", "quantity"],
    ["Stock", "quantity"],
    ["Image", "image_url"],
    ["Price", "price"],
  ])("%j -> %s", (input, expected) => {
    expect(normaliseHeader(input)).toBe(expected);
  });
});

describe("recordsToProducts", () => {
  it("publishes rows with an image and drafts rows without one", () => {
    const { rows, issues } = recordsToProducts(
      [good, { ...good, name: "Sourdough", image_url: "" }],
      COLUMNS,
    );
    expect(issues).toEqual([]);
    expect(rows).toEqual([
      {
        name: "Whole Milk",
        description: "Fresh",
        price: 2.49,
        quantity: 40,
        image_url: "https://example.com/milk.jpg",
        is_published: true,
      },
      {
        name: "Sourdough",
        description: "Fresh",
        price: 2.49,
        quantity: 40,
        image_url: null,
        is_published: false,
      },
    ]);
  });

  it("omits description when blank and trims values", () => {
    const { rows } = recordsToProducts(
      [{ ...good, name: "  Eggs  ", description: "   " }],
      COLUMNS,
    );
    expect(rows[0].name).toBe("Eggs");
    expect(rows[0]).not.toHaveProperty("description");
  });

  it("reports missing required columns once, as a file-level issue", () => {
    const { rows, issues } = recordsToProducts([{ name: "x" }], ["name"]);
    expect(rows).toEqual([]);
    expect(issues).toHaveLength(1);
    expect(issues[0].row).toBeNull();
    expect(issues[0].message).toMatch(/price, quantity/);
  });

  it("rejects an empty file", () => {
    const { issues } = recordsToProducts([], COLUMNS);
    expect(issues[0].message).toMatch(/no products/i);
  });

  it("rejects more than the row limit", () => {
    const many = Array.from({ length: CSV_MAX_ROWS + 1 }, () => good);
    const { rows, issues } = recordsToProducts(many, COLUMNS);
    expect(rows).toEqual([]);
    expect(issues[0].message).toMatch(String(CSV_MAX_ROWS));
  });

  it("collects every problem with the right product row numbers and imports nothing", () => {
    const { rows, issues } = recordsToProducts(
      [
        good,
        { ...good, price: "abc" },
        { ...good, price: "1.999" },
        { ...good, price: "0" },
        { ...good, price: "" },
        { ...good, quantity: "1.5" },
        { ...good, quantity: "-2" },
        { ...good, quantity: "" },
        { ...good, name: "A" },
        { ...good, image_url: "ftp://x/y.png" },
        { ...good, price: "x", quantity: "y" },
      ],
      COLUMNS,
    );
    expect(rows).toEqual([]); // all or nothing
    const byRow = (n: number) =>
      issues.filter((i) => i.row === n).map((i) => i.message);
    expect(byRow(1)).toEqual([]);
    expect(byRow(2)[0]).toMatch(/price must be a number/);
    expect(byRow(3)[0]).toMatch(/2 decimal places/);
    expect(byRow(4)[0]).toMatch(/greater than zero/);
    expect(byRow(5)[0]).toMatch(/price must be a number/);
    expect(byRow(6)[0]).toMatch(/quantity must be a whole number/);
    expect(byRow(7)[0]).toMatch(/negative/);
    expect(byRow(8)[0]).toMatch(/quantity must be a whole number/);
    expect(byRow(9)[0]).toMatch(/name is required/);
    expect(byRow(10)[0]).toMatch(/http/);
    expect(byRow(11)).toHaveLength(2); // both fields reported for the same row
  });

  it("accepts zero quantity (out of stock) and whole-number prices", () => {
    const { rows, issues } = recordsToProducts(
      [{ ...good, price: "5", quantity: "0" }],
      COLUMNS,
    );
    expect(issues).toEqual([]);
    expect(rows[0]).toMatchObject({ price: 5, quantity: 0 });
  });
});

describe("parseProductCsv", () => {
  const file = (text: string, name = "p.csv") =>
    new File([text], name, { type: "text/csv" });

  it("parses the downloadable template without issues", async () => {
    const { rows, issues } = await parseProductCsv(file(CSV_TEMPLATE));
    expect(issues).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.is_published)).toEqual([true, false]);
  });

  it("understands header variants, a BOM and blank lines", async () => {
    const text = "﻿Name,PRICE,Qty,Image URL\n\nTea,3.5,10,\n   \n";
    const { rows, issues } = await parseProductCsv(file(text));
    expect(issues).toEqual([]);
    expect(rows).toEqual([
      {
        name: "Tea",
        price: 3.5,
        quantity: 10,
        image_url: null,
        is_published: false,
      },
    ]);
  });

  it("keeps commas that are inside quoted fields", async () => {
    const text = 'name,price,quantity\n"Salt, fine",1.2,5\n';
    const { rows } = await parseProductCsv(file(text));
    expect(rows[0].name).toBe("Salt, fine");
  });

  it("reports a file with missing columns", async () => {
    const { issues } = await parseProductCsv(file("name,cost\nTea,3\n"));
    expect(issues[0].message).toMatch(/missing required column/i);
  });

  it("rejects oversized files before parsing", async () => {
    const big = file("x".repeat(1_500_001));
    const { issues } = await parseProductCsv(big);
    expect(issues[0].message).toMatch(/larger than 1.5 MB/);
  });
});
