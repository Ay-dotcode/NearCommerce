import {
  TestUser,
  cleanupFixtures,
  createTestCategory,
  createTestProduct,
  createTestStore,
  createTestSubcategory,
  createTestUser,
} from "@/__tests__/helpers/fixtures";
import { app } from "@/app";
import { db } from "@/config/database";
import { fetchGeminiEmbedding } from "@/utils/circuitBreaker";
import request from "supertest";

jest.mock("@/utils/circuitBreaker", () => ({
  ...jest.requireActual("@/utils/circuitBreaker"),
  fetchGeminiEmbedding: jest.fn(),
}));
const embed = fetchGeminiEmbedding as jest.Mock;

const IMG = "https://cdn.test/i.jpg";
const HERE = { lat: 1.0, lng: 1.0 };
const vec = (hot: number) =>
  Array.from({ length: 768 }, (_, i) => (i === hot ? 1 : 0));
const asVector = (v: number[]) => `[${v.join(",")}]`;

describe("GET /search filters", () => {
  let owner: TestUser;
  let suspendedOwner: TestUser;
  let storeId: string;
  let hiddenStoreId: string;
  let warn: jest.SpyInstance;

  const search = (query: Record<string, unknown> = {}) =>
    request(app)
      .get("/search")
      .query({ ...HERE, ...query });
  const names = (res: request.Response) =>
    res.body.data.map((p: any) => p.name);

  beforeAll(async () => {
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    owner = await createTestUser("STORE_OWNER");
    suspendedOwner = await createTestUser("STORE_OWNER", { suspended: true });
    const near = { latitude: 1.0, longitude: 1.0 };
    storeId = await createTestStore(owner.id, "Filter Store", near);
    hiddenStoreId = await createTestStore(
      suspendedOwner.id,
      "Hidden Owner Store",
      near,
    );
  });

  beforeEach(() => {
    embed.mockReset();
    embed.mockRejectedValue(new Error("AI unavailable")); // default: text fallback
  });

  afterEach(async () => {
    await db.query("DELETE FROM products WHERE store_id = ANY($1::uuid[])", [
      [storeId, hiddenStoreId],
    ]);
  });

  afterAll(async () => {
    warn.mockRestore();
    await cleanupFixtures();
    await db.end();
  });

  const product = (
    name: string,
    extra: Record<string, unknown> = {},
    store = storeId,
  ) =>
    createTestProduct(store, {
      name,
      isPublished: true,
      imageUrl: IMG,
      quantity: 5,
      ...extra,
    });

  describe("owner suspension (SRS 3.2.1)", () => {
    it("hides a suspended owner's products in nearby browse", async () => {
      await product("Visible Bread");
      await product("Hidden Bread", {}, hiddenStoreId);
      expect(names(await search())).toEqual(["Visible Bread"]);
    });

    it("hides them in text-fallback search too", async () => {
      await product("Visible Cheese");
      await product("Hidden Cheese", {}, hiddenStoreId);
      const res = await search({ q: "cheese" });
      expect(res.body.used_fallback).toBe(true);
      expect(names(res)).toEqual(["Visible Cheese"]);
    });

    it("hides them in AI search", async () => {
      embed.mockResolvedValue(vec(0));
      await product("Visible Tea");
      await product("Hidden Tea", {}, hiddenStoreId);
      const res = await search({ q: "tea" });
      expect(res.body.used_fallback).toBe(false);
      expect(names(res)).toEqual(["Visible Tea"]);
    });
  });

  describe("AI search ranking", () => {
    it("orders by embedding similarity and flags that the AI path was used", async () => {
      embed.mockResolvedValue(vec(7));
      const close = await product("Close Match");
      const far = await product("Far Match");
      await db.query(
        "UPDATE products SET embedding = $2::vector WHERE id = $1",
        [close, asVector(vec(7))],
      );
      await db.query(
        "UPDATE products SET embedding = $2::vector WHERE id = $1",
        [far, asVector(vec(300))],
      );

      const res = await search({ q: "anything" });
      expect(res.body.used_fallback).toBe(false);
      expect(names(res)).toEqual(["Close Match", "Far Match"]);
    });

    it("falls back to text search when the embedding call fails", async () => {
      await product("Orange Juice");
      await product("Garden Hose");
      const res = await search({ q: "juice" });
      expect(res.body.used_fallback).toBe(true);
      expect(names(res)).toEqual(["Orange Juice"]);
    });
  });

  describe("category filters", () => {
    let dairy: { id: string };
    let milkSub: { id: string };
    let cheeseSub: { id: string };
    let drinks: { id: string };
    let juiceSub: { id: string };

    beforeEach(async () => {
      dairy = await createTestCategory();
      milkSub = await createTestSubcategory(dairy.id, "Milk");
      cheeseSub = await createTestSubcategory(dairy.id, "Cheese");
      drinks = await createTestCategory();
      juiceSub = await createTestSubcategory(drinks.id, "Juice");
      await product("Whole Milk", { subcategoryId: milkSub.id });
      await product("Cheddar", { subcategoryId: cheeseSub.id });
      await product("Apple Juice", { subcategoryId: juiceSub.id });
      await product("Uncategorised Thing");
    });

    it("filters by subcategory", async () => {
      expect(names(await search({ subcategory_id: milkSub.id }))).toEqual([
        "Whole Milk",
      ]);
    });

    it("filters by whole category across its subcategories", async () => {
      expect(names(await search({ category_id: dairy.id })).sort()).toEqual([
        "Cheddar",
        "Whole Milk",
      ]);
    });

    it("lets the subcategory narrow a category", async () => {
      expect(
        names(
          await search({ category_id: dairy.id, subcategory_id: cheeseSub.id }),
        ),
      ).toEqual(["Cheddar"]);
    });

    it("combines with text search", async () => {
      expect(
        names(await search({ category_id: drinks.id, q: "juice" })),
      ).toEqual(["Apple Juice"]);
      expect(
        names(await search({ category_id: dairy.id, q: "juice" })),
      ).toEqual([]);
    });

    it("combines with the AI path", async () => {
      embed.mockResolvedValue(vec(1));
      const res = await search({ category_id: dairy.id, q: "anything" });
      expect(res.body.used_fallback).toBe(false);
      expect(names(res).sort()).toEqual(["Cheddar", "Whole Milk"]);
    });

    it("returns nothing for a category with no matching products", async () => {
      const empty = await createTestCategory();
      expect(names(await search({ category_id: empty.id }))).toEqual([]);
    });

    it.each([["category_id"], ["subcategory_id"]])(
      "rejects a malformed %s",
      async (key) => {
        const res = await search({ [key]: "nope" });
        expect(res.status).toBe(400);
        expect(res.body.details[0].path).toBe(key);
      },
    );
  });

  describe("text matching", () => {
    it("treats LIKE wildcards in the query literally", async () => {
      await product("Under_score Item");
      await product("Plain Item");
      // An unescaped "_" would match every product name.
      expect(names(await search({ q: "_" }))).toEqual(["Under_score Item"]);
    });

    it("still excludes drafts and sold-out products", async () => {
      await product("Live Soap");
      await createTestProduct(storeId, {
        name: "Draft Soap",
        isPublished: false,
        quantity: 5,
      });
      await product("Sold Out Soap", { quantity: 0 });
      expect(names(await search({ q: "soap" }))).toEqual(["Live Soap"]);
    });
  });

  it("still validates coordinates", async () => {
    const res = await request(app).get("/search").query({ q: "milk" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid search parameters");
  });
});
