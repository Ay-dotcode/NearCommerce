import { app } from "@/app";
import { db } from "@/config/database";
import { scheduleProductEmbeddings } from "@/services/embedding.service";
import request from "supertest";
import {
  cleanupFixtures,
  createTestProduct,
  createTestStore,
  createTestUser,
  TestUser,
} from "../helpers/fixtures";

jest.mock("@/services/embedding.service", () => ({
  ...jest.requireActual("@/services/embedding.service"),
  scheduleProductEmbeddings: jest.fn(),
}));
const scheduleMock = scheduleProductEmbeddings as jest.Mock;

const IMG = "https://cdn.nearcommerce.test/p.jpg";

describe("Owner product management API", () => {
  let owner: TestUser;
  let otherOwner: TestUser;
  let customer: TestUser;
  let storeId: string;
  let otherStoreId: string;

  const auth = (u: TestUser = owner, store: string = storeId) => ({
    Authorization: `Bearer ${u.token}`,
    "X-Store-ID": store,
  });

  beforeAll(async () => {
    owner = await createTestUser("STORE_OWNER");
    otherOwner = await createTestUser("STORE_OWNER");
    customer = await createTestUser("CUSTOMER");
    storeId = await createTestStore(owner.id, "Mine");
    otherStoreId = await createTestStore(otherOwner.id, "Theirs");
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

  describe("access control", () => {
    it("no longer exposes inventory without authentication (security fix)", async () => {
      await createTestProduct(storeId);
      const res = await request(app)
        .get("/products")
        .set("X-Store-ID", storeId);
      expect(res.status).toBe(401);
    });

    it("rejects customers", async () => {
      const res = await request(app).get("/products").set(auth(customer));
      expect(res.status).toBe(403);
    });

    it("requires X-Store-ID", async () => {
      const res = await request(app)
        .get("/products")
        .set("Authorization", `Bearer ${owner.token}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Missing X-Store-ID header/);
    });

    it("refuses another owner's store id", async () => {
      const res = await request(app)
        .get("/products")
        .set(auth(owner, otherStoreId));
      expect(res.status).toBe(403);
    });
  });

  describe("POST /products", () => {
    it("creates a draft by default, returns a numeric price, and schedules an embedding", async () => {
      const res = await request(app)
        .post("/products")
        .set(auth())
        .send({ name: "Olive oil", price: 7.5, quantity: 4 });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: "Olive oil",
        price: 7.5,
        quantity: 4,
        is_published: false,
        store_id: storeId,
      });
      expect(res.body.data).not.toHaveProperty("embedding");
      expect(scheduleMock).toHaveBeenCalledWith([res.body.data.id]);
    });

    it("publishes when an image is supplied", async () => {
      const res = await request(app).post("/products").set(auth()).send({
        name: "Feta",
        price: 4,
        quantity: 1,
        imageUrl: IMG,
        isPublished: true,
      });
      expect(res.status).toBe(201);
      expect(res.body.data.is_published).toBe(true);
    });

    it("refuses to publish without an image", async () => {
      const res = await request(app)
        .post("/products")
        .set(auth())
        .send({ name: "Feta", price: 4, isPublished: true });
      expect(res.status).toBe(400);
      expect(res.body.details[0].path).toBe("isPublished");
      expect(scheduleMock).not.toHaveBeenCalled();
    });

    it("validates price and quantity", async () => {
      const res = await request(app)
        .post("/products")
        .set(auth())
        .send({ name: "X1", price: -2, quantity: 1.5 });
      expect(res.status).toBe(400);
      expect(res.body.details.map((d: any) => d.path)).toEqual(
        expect.arrayContaining(["price", "quantity"]),
      );
    });

    it("rejects an unknown subcategory with 422", async () => {
      const res = await request(app).post("/products").set(auth()).send({
        name: "Feta",
        price: 4,
        subcategoryId: "00000000-0000-4000-8000-000000000000",
      });
      expect(res.status).toBe(422);
    });

    it("is also available at POST /stores/:storeId/products (used by the existing ProductForm)", async () => {
      const res = await request(app)
        .post(`/stores/${storeId}/products`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ name: "Honey", price: 9, quantity: 2 });
      expect(res.status).toBe(201);
      expect(res.body.data.store_id).toBe(storeId);
    });

    it("cannot create into another owner's store via the URL", async () => {
      const res = await request(app)
        .post(`/stores/${otherStoreId}/products`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ name: "Honey", price: 9 });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /products (owner list)", () => {
    beforeEach(async () => {
      await createTestProduct(storeId, {
        name: "Apple",
        isPublished: true,
        imageUrl: IMG,
      });
      await createTestProduct(storeId, { name: "Banana", quantity: 0 });
      await createTestProduct(storeId, {
        name: "Cherry 100%",
        verifiedDaysAgo: 45,
      });
      await createTestProduct(otherStoreId, { name: "Not mine" });
    });

    it("lists only this store's products with a summary and no internal columns", async () => {
      const res = await request(app).get("/products").set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0]).not.toHaveProperty("embedding");
      expect(res.body.meta).toMatchObject({
        total: 3,
        page: 1,
        pageSize: 25,
        totalPages: 1,
        summary: { total: 3, published: 1, drafts: 2, outOfStock: 1, stale: 1 },
      });
    });

    it.each([
      ["published", ["Apple"]],
      ["draft", ["Banana", "Cherry 100%"]],
      ["out_of_stock", ["Banana"]],
      ["stale", ["Cherry 100%"]],
    ])("filters by status=%s", async (status, names) => {
      const res = await request(app)
        .get(`/products?status=${status}`)
        .set(auth());
      expect(res.body.data.map((p: any) => p.name).sort()).toEqual(names);
    });

    it("searches by name and treats % literally", async () => {
      const a = await request(app).get("/products?q=ban").set(auth());
      expect(a.body.data.map((p: any) => p.name)).toEqual(["Banana"]);
      const pct = await request(app).get("/products?q=%25").set(auth());
      expect(pct.body.data.map((p: any) => p.name)).toEqual(["Cherry 100%"]);
    });

    it("paginates", async () => {
      const res = await request(app)
        .get("/products?page=2&pageSize=2")
        .set(auth());
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta).toMatchObject({
        page: 2,
        pageSize: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it("validates query params", async () => {
      expect(
        (await request(app).get("/products?pageSize=999").set(auth())).status,
      ).toBe(400);
    });
  });

  describe("PATCH /products/:productId", () => {
    it("refreshes last_verified_at when the price changes (SRS 3.2.4)", async () => {
      const id = await createTestProduct(storeId, {
        price: 5,
        verifiedDaysAgo: 40,
      });
      const res = await request(app)
        .patch(`/products/${id}`)
        .set(auth())
        .send({ price: 6 });
      expect(res.status).toBe(200);
      expect(res.body.data.price).toBe(6);
      expect(res.body.data.isStale).toBe(false);
    });

    it("refreshes when the quantity changes", async () => {
      const id = await createTestProduct(storeId, {
        quantity: 3,
        verifiedDaysAgo: 40,
      });
      const res = await request(app)
        .patch(`/products/${id}`)
        .set(auth())
        .send({ quantity: 9 });
      expect(res.body.data.isStale).toBe(false);
    });

    it("does NOT refresh for description-only edits or unchanged values", async () => {
      const id = await createTestProduct(storeId, {
        price: 5,
        quantity: 3,
        verifiedDaysAgo: 40,
      });
      const res = await request(app)
        .patch(`/products/${id}`)
        .set(auth())
        .send({ description: "Now with notes", price: 5, quantity: 3 });
      expect(res.status).toBe(200);
      expect(res.body.data.isStale).toBe(true);
    });

    it("re-embeds only when name/description changed", async () => {
      const id = await createTestProduct(storeId, { name: "Same" });
      // fixtures insert without an embedding, so the first update also schedules one
      await request(app)
        .patch(`/products/${id}`)
        .set(auth())
        .send({ price: 8 });
      expect(scheduleMock).toHaveBeenCalledWith([id]);

      scheduleMock.mockClear();
      await db.query(
        "UPDATE products SET embedding = array_fill(0.1::real, ARRAY[768])::vector WHERE id = $1",
        [id],
      );
      await request(app)
        .patch(`/products/${id}`)
        .set(auth())
        .send({ price: 9 });
      expect(scheduleMock).not.toHaveBeenCalled();

      await request(app)
        .patch(`/products/${id}`)
        .set(auth())
        .send({ name: "Renamed" });
      expect(scheduleMock).toHaveBeenCalledWith([id]);
    });

    it("publishes once an image exists and refuses without one", async () => {
      const id = await createTestProduct(storeId);
      const bad = await request(app)
        .patch(`/products/${id}`)
        .set(auth())
        .send({ isPublished: true });
      expect(bad.status).toBe(422);
      const ok = await request(app)
        .patch(`/products/${id}`)
        .set(auth())
        .send({ isPublished: true, imageUrl: IMG });
      expect(ok.status).toBe(200);
      expect(ok.body.data.is_published).toBe(true);
    });

    it("refuses to remove the image from a published product", async () => {
      const id = await createTestProduct(storeId, {
        isPublished: true,
        imageUrl: IMG,
      });
      const res = await request(app)
        .patch(`/products/${id}`)
        .set(auth())
        .send({ imageUrl: null });
      expect(res.status).toBe(422);
      const ok = await request(app)
        .patch(`/products/${id}`)
        .set(auth())
        .send({ imageUrl: null, isPublished: false });
      expect(ok.status).toBe(200);
      expect(ok.body.data.image_url).toBeNull();
    });

    it("404s for a product in a different store, even if the id exists", async () => {
      const theirs = await createTestProduct(otherStoreId);
      const res = await request(app)
        .patch(`/products/${theirs}`)
        .set(auth())
        .send({ price: 1 });
      expect(res.status).toBe(404);
      const { rows } = await db.query(
        "SELECT price FROM products WHERE id = $1",
        [theirs],
      );
      expect(Number(rows[0].price)).toBe(5);
    });

    it("404s for a malformed id and 400s for an empty body", async () => {
      expect(
        (
          await request(app)
            .patch("/products/nope")
            .set(auth())
            .send({ price: 1 })
        ).status,
      ).toBe(404);
      const id = await createTestProduct(storeId);
      expect(
        (await request(app).patch(`/products/${id}`).set(auth()).send({}))
          .status,
      ).toBe(400);
    });
  });

  describe("DELETE /products/:productId", () => {
    it("deletes then 404s on repeat", async () => {
      const id = await createTestProduct(storeId);
      expect(
        (await request(app).delete(`/products/${id}`).set(auth())).status,
      ).toBe(204);
      expect(
        (await request(app).delete(`/products/${id}`).set(auth())).status,
      ).toBe(404);
    });

    it("cannot delete another store's product", async () => {
      const theirs = await createTestProduct(otherStoreId);
      expect(
        (await request(app).delete(`/products/${theirs}`).set(auth())).status,
      ).toBe(404);
      expect(
        (await db.query("SELECT 1 FROM products WHERE id = $1", [theirs]))
          .rowCount,
      ).toBe(1);
    });

    it("keeps household list items visible after a product is deleted", async () => {
      const id = await createTestProduct(storeId, { name: "Gone soon" });
      const list = await db.query(
        `INSERT INTO household_lists (name, invite_code) VALUES ('t', $1) RETURNING id`,
        [Math.random().toString(36).slice(2, 12)],
      );
      await db.query(
        `INSERT INTO household_list_items (list_id, product_id, item_name) VALUES ($1, $2, 'Gone soon')`,
        [list.rows[0].id, id],
      );
      await request(app).delete(`/products/${id}`).set(auth());
      const item = await db.query(
        "SELECT item_name, product_id FROM household_list_items WHERE list_id = $1",
        [list.rows[0].id],
      );
      expect(item.rows[0]).toEqual({
        item_name: "Gone soon",
        product_id: null,
      });
      await db.query("DELETE FROM household_lists WHERE id = $1", [
        list.rows[0].id,
      ]);
    });
  });

  describe("GET /products/:productId (public)", () => {
    it("does not leak the embedding vector", async () => {
      const id = await createTestProduct(storeId, {
        isPublished: true,
        imageUrl: IMG,
      });
      await db.query(
        "UPDATE products SET embedding = array_fill(0.1::real, ARRAY[768])::vector WHERE id = $1",
        [id],
      );
      const res = await request(app).get(`/products/${id}`);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty("embedding");
      expect(res.body).not.toHaveProperty("search_tsv");
      expect(typeof res.body.price).toBe("number");
    });

    it("is hidden when the owner is suspended (SRS 3.2.1)", async () => {
      const suspended = await createTestUser("STORE_OWNER", {
        suspended: true,
      });
      const s = await createTestStore(suspended.id);
      const id = await createTestProduct(s, {
        isPublished: true,
        imageUrl: IMG,
      });
      expect((await request(app).get(`/products/${id}`)).status).toBe(404);
    });

    it("hides drafts", async () => {
      const id = await createTestProduct(storeId);
      expect((await request(app).get(`/products/${id}`)).status).toBe(404);
    });
  });

  describe("PATCH /products/:productId/confirm-stock (existing)", () => {
    it("still works and no longer returns the embedding column", async () => {
      const id = await createTestProduct(storeId, { verifiedDaysAgo: 40 });
      const res = await request(app)
        .patch(`/products/${id}/confirm-stock`)
        .set(auth());
      expect(res.status).toBe(200);
      expect(res.body.data.isStale).toBe(false);
      expect(res.body.data).not.toHaveProperty("embedding");
    });
  });
});
