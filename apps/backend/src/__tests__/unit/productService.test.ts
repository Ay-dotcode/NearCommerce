import {
  dedupeImportRows,
  resolveImportVisibility,
  serializeProduct,
  shouldRefreshFreshness,
} from "@/services/product.service";
import {
  CreateProductSchema,
  ImportProductRowSchema,
  ProductListQuerySchema,
  UpdateProductSchema,
} from "@nearcommerce/api";

describe("shouldRefreshFreshness (SRS 3.2.4)", () => {
  const current = { price: "9.99", quantity: 5 }; // pg returns DECIMAL as string

  it("refreshes when the price changes", () =>
    expect(shouldRefreshFreshness(current, { price: 10.5 })).toBe(true));
  it("refreshes when the quantity changes", () =>
    expect(shouldRefreshFreshness(current, { quantity: 4 })).toBe(true));
  it("does not refresh when the same price/quantity is re-submitted", () =>
    expect(shouldRefreshFreshness(current, { price: 9.99, quantity: 5 })).toBe(
      false,
    ));
  it("does not refresh for unrelated edits", () =>
    expect(shouldRefreshFreshness(current, {})).toBe(false));
});

describe("serializeProduct", () => {
  it("converts DECIMAL strings to numbers and flags stale products", () => {
    const old = new Date(Date.now() - 40 * 86_400_000).toISOString();
    const dto = serializeProduct({
      id: "1",
      price: "12.50",
      last_verified_at: old,
    });
    expect(dto.price).toBe(12.5);
    expect(dto.isStale).toBe(true);
  });
});

describe("dedupeImportRows", () => {
  it("keeps the last row for a repeated name (case-insensitive) and counts merges", () => {
    const { rows, merged } = dedupeImportRows([
      { name: "Milk", price: 1, quantity: 1 },
      { name: "milk ", price: 2, quantity: 2 },
      { name: "Bread", price: 3, quantity: 3 },
    ]);
    expect(merged).toBe(1);
    expect(rows).toHaveLength(2);
    expect(
      rows.find((r) => r.name.trim().toLowerCase() === "milk")?.price,
    ).toBe(2);
  });
});

describe("resolveImportVisibility", () => {
  it("publishes a new product that has an image", () =>
    expect(
      resolveImportVisibility({
        name: "A",
        price: 1,
        quantity: 1,
        image_url: "https://x.test/a.jpg",
      }),
    ).toEqual({ imageUrl: "https://x.test/a.jpg", isPublished: true }));

  it("drafts a new product without an image", () =>
    expect(
      resolveImportVisibility({ name: "A", price: 1, quantity: 1 }),
    ).toEqual({
      imageUrl: null,
      isPublished: false,
    }));

  it("respects an explicit is_published=false on a row with an image", () =>
    expect(
      resolveImportVisibility({
        name: "A",
        price: 1,
        quantity: 1,
        image_url: "https://x.test/a.jpg",
        is_published: false,
      }).isPublished,
    ).toBe(false));

  it("keeps the existing image and visibility when an update row has no image", () =>
    expect(
      resolveImportVisibility(
        {
          name: "A",
          price: 2,
          quantity: 2,
          image_url: null,
          is_published: false,
        },
        { image_url: "https://x.test/old.jpg", is_published: true },
      ),
    ).toEqual({ imageUrl: "https://x.test/old.jpg", isPublished: true }));
});

describe("product schemas", () => {
  const base = { name: "Olive oil", price: 7.5, quantity: 3 };

  it("CreateProductSchema defaults to an unpublished draft", () => {
    const parsed = CreateProductSchema.parse({ name: "Olive oil", price: 7.5 });
    expect(parsed.isPublished).toBe(false);
    expect(parsed.quantity).toBe(0);
  });

  it("CreateProductSchema refuses to publish without an image", () =>
    expect(
      CreateProductSchema.safeParse({ ...base, isPublished: true }).success,
    ).toBe(false));

  it("CreateProductSchema publishes with an image", () =>
    expect(
      CreateProductSchema.safeParse({
        ...base,
        isPublished: true,
        imageUrl: "https://x.test/o.jpg",
      }).success,
    ).toBe(true));

  it.each([
    ["zero price", { price: 0 }],
    ["3 decimal places", { price: 1.005 }],
    ["negative quantity", { quantity: -1 }],
    ["fractional quantity", { quantity: 1.5 }],
    ["javascript: image URL", { imageUrl: "javascript:alert(1)" }],
  ])("CreateProductSchema rejects %s", (_n, patch) =>
    expect(CreateProductSchema.safeParse({ ...base, ...patch }).success).toBe(
      false,
    ),
  );

  it("UpdateProductSchema accepts a partial body and rejects an empty one", () => {
    expect(UpdateProductSchema.safeParse({ quantity: 2 }).success).toBe(true);
    expect(UpdateProductSchema.safeParse({}).success).toBe(false);
  });

  it("UpdateProductSchema allows removing the image with null", () =>
    expect(UpdateProductSchema.safeParse({ imageUrl: null }).success).toBe(
      true,
    ));

  it("ImportProductRowSchema matches what the CSV importer sends", () =>
    expect(
      ImportProductRowSchema.safeParse({
        name: "Draft",
        price: 9.99,
        quantity: 10,
        image_url: null,
        is_published: false,
      }).success,
    ).toBe(true));

  it("ProductListQuerySchema applies defaults and coerces query strings", () => {
    const parsed = ProductListQuerySchema.parse({ page: "2", pageSize: "10" });
    expect(parsed).toMatchObject({ page: 2, pageSize: 10, status: "all" });
    expect(ProductListQuerySchema.safeParse({ pageSize: "500" }).success).toBe(
      false,
    );
    expect(ProductListQuerySchema.safeParse({ status: "weird" }).success).toBe(
      false,
    );
  });
});
