import type { ProductImportRow } from "@/types/products";
import Papa from "papaparse";

// Keep in step with IMPORT_MAX_ROWS in @nearcommerce/api (the server rejects more).
export const CSV_MAX_ROWS = 1000;
// The API accepts a 2 MB JSON body; 1.5 MB of CSV leaves headroom for JSON overhead.
export const CSV_MAX_BYTES = 1_500_000;
const MAX_PRICE = 99_999_999.99;
const MAX_QUANTITY = 1_000_000;

export const CSV_TEMPLATE = [
  "name,description,price,quantity,image_url",
  "Whole Milk 1L,Fresh pasteurised whole milk,2.49,40,https://example.com/images/milk.jpg",
  "Sourdough Loaf,Baked this morning,3.20,12,",
  "",
].join("\n");

export interface CsvIssue {
  // 1-based product row, not counting the header. Null for problems with the file itself.
  row: number | null;
  message: string;
}

export interface ParsedCsv {
  rows: ProductImportRow[];
  issues: CsvIssue[];
}

const HEADER_ALIASES: Record<string, string> = {
  title: "name",
  product: "name",
  product_name: "name",
  qty: "quantity",
  stock: "quantity",
  image: "image_url",
  imageurl: "image_url",
  image_link: "image_url",
};

// "Image URL", " image-url ", "﻿Name" -> "image_url" / "name".
export function normaliseHeader(header: string): string {
  const cleaned = header
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return HEADER_ALIASES[cleaned] ?? cleaned;
}

const REQUIRED_COLUMNS = ["name", "price", "quantity"] as const;

const hasAtMostTwoDecimals = (v: number) =>
  Math.abs(v * 100 - Math.round(v * 100)) < 1e-6;

// Turns parsed CSV records into import rows, collecting every problem rather than stopping
// at the first. Mirrors the server's row rules so owners fix everything in one pass.
// A row with an image URL is published; without one it becomes a draft (SRS 4.2.2).
export function recordsToProducts(
  records: Record<string, string | undefined>[],
  columns: string[],
): ParsedCsv {
  const issues: CsvIssue[] = [];
  const missing = REQUIRED_COLUMNS.filter((c) => !columns.includes(c));
  if (missing.length > 0) {
    issues.push({
      row: null,
      message: `The file is missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the template to see the expected format.`,
    });
    return { rows: [], issues };
  }
  if (records.length === 0) {
    return {
      rows: [],
      issues: [{ row: null, message: "The file contains no products." }],
    };
  }
  if (records.length > CSV_MAX_ROWS) {
    return {
      rows: [],
      issues: [
        {
          row: null,
          message: `Import at most ${CSV_MAX_ROWS} products at once. This file has ${records.length}. Split it into smaller files.`,
        },
      ],
    };
  }

  const rows: ProductImportRow[] = [];
  records.forEach((record, index) => {
    const row = index + 1;
    const problems: string[] = [];

    const name = (record.name ?? "").trim();
    if (name.length < 2)
      problems.push("name is required (at least 2 characters)");
    else if (name.length > 255)
      problems.push("name is too long (255 characters maximum)");

    const priceText = (record.price ?? "").trim();
    const price = priceText === "" ? NaN : Number(priceText);
    if (!Number.isFinite(price))
      problems.push("price must be a number such as 19.99");
    else if (price <= 0) problems.push("price must be greater than zero");
    else if (price > MAX_PRICE) problems.push("price is too large");
    else if (!hasAtMostTwoDecimals(price))
      problems.push("price can have at most 2 decimal places");

    const quantityText = (record.quantity ?? "").trim();
    const quantity = quantityText === "" ? NaN : Number(quantityText);
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity))
      problems.push("quantity must be a whole number");
    else if (quantity < 0) problems.push("quantity cannot be negative");
    else if (quantity > MAX_QUANTITY) problems.push("quantity is too large");

    const imageUrl = (record.image_url ?? "").trim();
    if (imageUrl) {
      if (imageUrl.length > 512)
        problems.push("image_url is too long (512 characters maximum)");
      else if (!/^https?:\/\/\S+$/i.test(imageUrl))
        problems.push("image_url must start with http:// or https://");
    }

    const description = (record.description ?? "").trim();
    if (description.length > 5000)
      problems.push("description is too long (5000 characters maximum)");

    if (problems.length > 0) {
      for (const message of problems) issues.push({ row, message });
      return;
    }

    const product: ProductImportRow = {
      name,
      price,
      quantity,
      image_url: imageUrl || null,
      is_published: Boolean(imageUrl),
    };
    if (description) product.description = description;
    rows.push(product);
  });

  // Never import a partial file: a half-applied import is hard to reason about and to undo.
  return issues.length > 0 ? { rows: [], issues } : { rows, issues };
}

export function parseProductCsv(file: File): Promise<ParsedCsv> {
  return new Promise((resolve) => {
    if (file.size > CSV_MAX_BYTES) {
      return resolve({
        rows: [],
        issues: [
          {
            row: null,
            message:
              "This file is larger than 1.5 MB. Split it into smaller files.",
          },
        ],
      });
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normaliseHeader,
      complete: (results) => {
        const fatal = results.errors.find((e) => e.type === "Quotes");
        if (fatal)
          return resolve({
            rows: [],
            issues: [
              {
                row: null,
                message:
                  "We couldn't read this file as a CSV. Check that it is comma separated.",
              },
            ],
          });
        resolve(recordsToProducts(results.data, results.meta.fields ?? []));
      },
      error: () =>
        resolve({
          rows: [],
          issues: [{ row: null, message: "Unable to read the CSV file." }],
        }),
    });
  });
}

// Triggers a browser download of the starter template.
export function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "nearcommerce-products-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
