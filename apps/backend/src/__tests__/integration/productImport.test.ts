import {
  cleanupFixtures,
  createTestProduct,
  createTestStore,
  createTestUser,
  TestUser,
} from "@/__tests__/helpers/fixtures";
import { app } from "@/app";
import { db } from "@/config/database";
import { scheduleProductEmbeddings } from "@/services/embedding.service";
import { IMPORT_MAX_ROWS } from "@nearcommerce/api";
import request from "supertest";

jest.mock("@/services/embedding.service", () => ({
  ...jest.requireActual("@/services/embedding.service"),
  scheduleProductEmbeddings: jest.fn(),
}));
const scheduleMock = scheduleProductEmbeddings as jest.Mock;

const IMG = "https://cdn.nearcommerce.test/x.jpg";

describe("POST /products/import", () => {
  let owner: TestUser;
  let other: TestUser;
  let customer: TestUser;
  let storeId: string;
  let otherStoreId: string;

  const post = (products: unknown[], u = owner, store = storeId) =>
    request(app)
      .post("/products/import")
      .set({ Authorization: `Bearer ${u.token}`, "X-Store-ID": store })
      .send({ products });
  const names = async () =>
    (
      await db.query(
        "SELECT name FROM products WHERE store_id = $1 ORDER BY name",
        [storeId],
      )
    ).rows.map((r) => r.name);

  beforeAll(async () => {
    owner = await createTestUser("STORE_OWNER");
    other = await createTestUser("STORE_OWNER");
    customer = await createTestUser("CUSTOMER");
    storeId = await createTestStore(owner.id);
    otherStoreId = await createTestStore(other.id);
  });

  beforeEach(async () => {
    scheduleMock.mockClear();
    await db.query("DELETE FROM products WHERE store_id = ANY($1::uuid[])", [
      [storeId, otherStoreId],
    ]);
  });

  afterAll(async () => {
    await cleanupFixtures();
    await db.end();
  });

  it("requires an owner who owns the target store", async () => {
    expect(
      (await request(app).post("/products/import").send({ products: [] }))
        .status,
    ).toBe(401);
    expect(
      (await post([{ name: "A1", price: 1, quantity: 1 }], customer)).status,
    ).toBe(403);
    expect(
      (await post([{ name: "A1", price: 1, quantity: 1 }], owner, otherStoreId))
        .status,
    ).toBe(403);
  });

  it("creates published products with an image and drafts without (dual-mode)", async () => {
    const res = await post([
      {
        name: "Published Item",
        price: 19.99,
        quantity: 5,
        image_url: IMG,
        is_published: true,
      },
      {
        name: "Draft Item",
        price: 9.99,
        quantity: 10,
        image_url: null,
        is_published: false,
      },
    ]);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      total: 2,
      created: 2,
      updated: 0,
      duplicatesMerged: 0,
    });

    const { rows } = await db.query(
      "SELECT name, is_published, image_url, price FROM products WHERE store_id = $1 ORDER BY name",
      [storeId],
    );
    expect(rows).toEqual([
      {
        name: "Draft Item",
        is_published: false,
        image_url: null,
        price: "9.99",
      },
      {
        name: "Published Item",
        is_published: true,
        image_url: IMG,
        price: "19.99",
      },
    ]);
  });

  it("never publishes a row without an image even if the client says so", async () => {
    const res = await post([
      { name: "Liar", price: 1, quantity: 1, is_published: true },
    ]);
    expect(res.status).toBe(200);
    const { rows } = await db.query(
      "SELECT is_published FROM products WHERE store_id = $1",
      [storeId],
    );
    expect(rows[0].is_published).toBe(false);
  });

  it("updates existing products by name (case-insensitive) without wiping their image or visibility", async () => {
    const id = await createTestProduct(storeId, {
      name: "Milk",
      price: 2,
      quantity: 5,
      imageUrl: IMG,
      isPublished: true,
      verifiedDaysAgo: 40,
    });
    const res = await post([
      {
        name: "  milk ",
        price: 2.5,
        quantity: 8,
        image_url: null,
        is_published: false,
      },
    ]);

    expect(res.body.data).toMatchObject({ created: 0, updated: 1 });
    const { rows } = await db.query(
      "SELECT price, quantity, image_url, is_published, last_verified_at FROM products WHERE id = $1",
      [id],
    );
    expect(Number(rows[0].price)).toBe(2.5);
    expect(rows[0].quantity).toBe(8);
    expect(rows[0].image_url).toBe(IMG);
    expect(rows[0].is_published).toBe(true);
    expect(
      Date.now() - new Date(rows[0].last_verified_at).getTime(),
    ).toBeLessThan(10_000); // freshness refreshed
    expect(await names()).toEqual(["Milk"]); // no duplicate created
  });

  it("does not refresh freshness when price and quantity are unchanged", async () => {
    const id = await createTestProduct(storeId, {
      name: "Bread",
      price: 3,
      quantity: 2,
      verifiedDaysAgo: 40,
    });
    await post([
      { name: "Bread", price: 3, quantity: 2, description: "Sourdough" },
    ]);
    const { rows } = await db.query(
      "SELECT description, last_verified_at FROM products WHERE id = $1",
      [id],
    );
    expect(rows[0].description).toBe("Sourdough");
    expect(
      Date.now() - new Date(rows[0].last_verified_at).getTime(),
    ).toBeGreaterThan(39 * 86_400_000);
  });

  it("merges duplicate names inside the file (last row wins)", async () => {
    const res = await post([
      { name: "Eggs", price: 3, quantity: 1 },
      { name: "eggs", price: 4, quantity: 2 },
    ]);
    expect(res.body.data).toMatchObject({
      total: 2,
      created: 1,
      duplicatesMerged: 1,
    });
    const { rows } = await db.query(
      "SELECT price FROM products WHERE store_id = $1",
      [storeId],
    );
    expect(Number(rows[0].price)).toBe(4);
  });

  it("only updates products inside the caller's store", async () => {
    const theirs = await createTestProduct(otherStoreId, {
      name: "Shared Name",
      price: 1,
    });
    await post([{ name: "Shared Name", price: 99, quantity: 1 }]);
    const { rows } = await db.query(
      "SELECT price FROM products WHERE id = $1",
      [theirs],
    );
    expect(Number(rows[0].price)).toBe(1);
    expect(await names()).toEqual(["Shared Name"]); // a new product was created in my store instead
  });

  it("schedules embeddings for created products and changed descriptions only", async () => {
    await db.query("DELETE FROM products WHERE store_id = $1", [storeId]);
    const existing = await createTestProduct(storeId, {
      name: "Old",
      description: "same",
    });
    await db.query(
      "UPDATE products SET embedding = array_fill(0.1::real, ARRAY[768])::vector WHERE id = $1",
      [existing],
    );

    await post([
      { name: "Old", price: 5, quantity: 3, description: "same" }, // unchanged text, has embedding
      { name: "Brand new", price: 1, quantity: 1 },
    ]);
    const ids: string[] = scheduleMock.mock.calls[0][0];
    expect(ids).toHaveLength(1);
    expect(ids).not.toContain(existing);
  });

  it("is atomic: one bad row rejects the file and reports every problem with row numbers", async () => {
    const res = await post([
      { name: "Good", price: 1, quantity: 1 },
      { name: "", price: 1, quantity: 1 },
      { name: "Bad price", price: -5, quantity: 1 },
      { name: "Bad image", price: 1, quantity: 1, image_url: "ftp://x" },
    ]);
    expect(res.status).toBe(422);
    const paths: string[] = res.body.details.map((d: any) => d.path);
    expect(paths.some((p) => p.startsWith("row 2"))).toBe(true);
    expect(paths.some((p) => p.startsWith("row 3: price"))).toBe(true);
    expect(paths.some((p) => p.startsWith("row 4: image_url"))).toBe(true);
    expect(await names()).toEqual([]); // nothing imported
    expect(scheduleMock).not.toHaveBeenCalled();
  });

  it("rejects an empty import and an oversized one", async () => {
    expect((await post([])).status).toBe(400);
    const tooMany = Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => ({
      name: `P${i}`,
      price: 1,
      quantity: 1,
    }));
    expect((await post(tooMany)).status).toBe(400);
  });

  it("handles the maximum import size in one request (body > 100kb)", async () => {
    const rows = Array.from({ length: IMPORT_MAX_ROWS }, (_, i) => ({
      name: `Bulk product ${i}`,
      description: "d".repeat(150),
      price: 1 + (i % 50),
      quantity: i % 7,
    }));
    expect(JSON.stringify({ products: rows }).length).toBeGreaterThan(
      100 * 1024,
    );

    const started = Date.now();
    const res = await post(rows);
    expect(res.status).toBe(200);
    expect(res.body.data.created).toBe(IMPORT_MAX_ROWS);
    expect(Date.now() - started).toBeLessThan(10_000);
    expect(scheduleMock.mock.calls[0][0]).toHaveLength(IMPORT_MAX_ROWS);
  });
});
