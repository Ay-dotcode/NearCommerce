import { applyVerified } from "@/helpers/productCache";
import type { ProductListResponse } from "@/types/products";

const list = (): ProductListResponse => ({
  data: [
    {
      id: "a",
      name: "A",
      price: 1,
      quantity: 1,
      is_published: true,
      last_verified_at: "2020-01-01T00:00:00Z",
      isStale: true,
    },
    {
      id: "b",
      name: "B",
      price: 1,
      quantity: 1,
      is_published: true,
      last_verified_at: "2020-01-01T00:00:00Z",
      isStale: true,
    },
  ],
  meta: {
    total: 2,
    page: 1,
    pageSize: 25,
    totalPages: 1,
    summary: { total: 2, published: 2, drafts: 0, outOfStock: 0, stale: 2 },
  },
});

describe("applyVerified", () => {
  it("refreshes only the verified product and lowers the stale count by one", () => {
    const next = applyVerified(list(), "a", true, "2026-10-10T00:00:00Z")!;
    expect(next.data[0]).toMatchObject({
      isStale: false,
      last_verified_at: "2026-10-10T00:00:00Z",
    });
    expect(next.data[1].isStale).toBe(true);
    expect(next.meta?.summary.stale).toBe(1);
  });

  it("still lowers the store-wide count in a cached list that does not contain the product", () => {
    const next = applyVerified(list(), "zzz", true, "2026-10-10T00:00:00Z")!;
    expect(next.meta?.summary.stale).toBe(1);
    expect(next.data.every((p) => p.isStale)).toBe(true);
  });

  it("leaves the count alone when the product was not stale, and never goes below zero", () => {
    expect(applyVerified(list(), "a", false, "x")!.meta?.summary.stale).toBe(2);
    const empty = list();
    empty.meta!.summary.stale = 0;
    expect(applyVerified(empty, "a", true, "x")!.meta?.summary.stale).toBe(0);
  });

  it("passes through missing cache entries and lists without a summary", () => {
    expect(applyVerified(undefined, "a", true, "x")).toBeUndefined();
    const noMeta: ProductListResponse = { data: list().data };
    expect(applyVerified(noMeta, "a", true, "x")!.meta).toBeUndefined();
  });
});
