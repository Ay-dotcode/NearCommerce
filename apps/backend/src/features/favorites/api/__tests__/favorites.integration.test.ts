import {
  ALWAYS_OPEN,
  TestUser,
  cleanupFixtures,
  createTestProduct,
  createTestStore,
  createTestUser,
} from "@/__tests__/helpers/fixtures";
import { app } from "@/app";
import { db } from "@/config/database";
import { FAVORITES_MAX } from "@nearcommerce/api";
import request from "supertest";

const auth = (u: TestUser) => ({ Authorization: `Bearer ${u.token}` });
const UNKNOWN = "00000000-0000-4000-8000-000000000000";
const IMG = "https://cdn.test/p.jpg";

describe("Favorites", () => {
  let shopper: TestUser;
  let other: TestUser;
  let owner: TestUser;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    shopper = await createTestUser("CUSTOMER");
    other = await createTestUser("CUSTOMER");
    owner = await createTestUser("STORE_OWNER");
    storeId = await createTestStore(owner.id, "Fav Store", {
      openingHours: ALWAYS_OPEN,
    });
    productId = await createTestProduct(storeId, {
      name: "Fav Milk",
      price: 2.5,
      quantity: 3,
      isPublished: true,
      imageUrl: IMG,
    });
  });

  afterEach(async () => {
    await db.query("DELETE FROM favorites WHERE user_id = ANY($1::uuid[])", [
      [shopper.id, other.id],
    ]);
    await db.query("UPDATE users SET is_suspended = false WHERE id = $1", [
      owner.id,
    ]);
    await db.query("UPDATE stores SET is_suspended = false WHERE id = $1", [
      storeId,
    ]);
    await db.query("UPDATE products SET is_published = true WHERE id = $1", [
      productId,
    ]);
  });

  afterAll(async () => {
    await cleanupFixtures();
    await db.end();
  });

  describe("authentication", () => {
    it.each([
      ["get", "/favorites"],
      ["post", "/favorites"],
      ["delete", `/favorites/${UNKNOWN}`],
    ])("%s %s requires a token", async (method, path) => {
      const res = await (request(app) as any)[method](path).send({});
      expect(res.status).toBe(401);
    });

    it("is also reachable under /api", async () => {
      const res = await request(app).get("/api/favorites").set(auth(shopper));
      expect(res.status).toBe(200);
    });
  });

  describe("POST /favorites", () => {
    it("saves a store, then a product", async () => {
      const s = await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      expect(s.status).toBe(201);
      expect(s.body).toMatchObject({
        data: { store_id: storeId, product_id: null },
        already_favorited: false,
      });

      const p = await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ product_id: productId });
      expect(p.status).toBe(201);
      expect(p.body.data.product_id).toBe(productId);
    });

    it("is idempotent: saving twice returns the same favorite", async () => {
      const first = await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      const second = await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      expect(second.status).toBe(200);
      expect(second.body.already_favorited).toBe(true);
      expect(second.body.data.id).toBe(first.body.data.id);
      const { rows } = await db.query(
        "SELECT COUNT(*)::int n FROM favorites WHERE user_id = $1",
        [shopper.id],
      );
      expect(rows[0].n).toBe(1);
    });

    it("treats two simultaneous saves as one favorite", async () => {
      const [a, b] = await Promise.all([
        request(app)
          .post("/favorites")
          .set(auth(shopper))
          .send({ product_id: productId }),
        request(app)
          .post("/favorites")
          .set(auth(shopper))
          .send({ product_id: productId }),
      ]);
      expect([a.status, b.status].sort()).toEqual([200, 201]);
      expect(a.body.data.id).toBe(b.body.data.id);
    });

    it("lets different users save the same store independently", async () => {
      const a = await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      const b = await request(app)
        .post("/favorites")
        .set(auth(other))
        .send({ store_id: storeId });
      expect(a.status).toBe(201);
      expect(b.status).toBe(201);
      expect(a.body.data.id).not.toBe(b.body.data.id);
    });

    it.each([
      ["neither target", {}],
      ["both targets", { store_id: "STORE", product_id: "PRODUCT" }],
      ["a malformed id", { store_id: "nope" }],
    ])("rejects %s", async (_label, body) => {
      const payload = JSON.parse(
        JSON.stringify(body)
          .replace("STORE", storeId)
          .replace("PRODUCT", productId),
      );
      const res = await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send(payload);
      expect(res.status).toBe(400);
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it("404s for targets that don't exist", async () => {
      expect(
        (
          await request(app)
            .post("/favorites")
            .set(auth(shopper))
            .send({ store_id: UNKNOWN })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app)
            .post("/favorites")
            .set(auth(shopper))
            .send({ product_id: UNKNOWN })
        ).status,
      ).toBe(404);
    });

    it("refuses stores and products shoppers cannot see", async () => {
      await db.query("UPDATE stores SET is_suspended = true WHERE id = $1", [
        storeId,
      ]);
      expect(
        (
          await request(app)
            .post("/favorites")
            .set(auth(shopper))
            .send({ store_id: storeId })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app)
            .post("/favorites")
            .set(auth(shopper))
            .send({ product_id: productId })
        ).status,
      ).toBe(404);

      await db.query("UPDATE stores SET is_suspended = false WHERE id = $1", [
        storeId,
      ]);
      await db.query("UPDATE users SET is_suspended = true WHERE id = $1", [
        owner.id,
      ]);
      expect(
        (
          await request(app)
            .post("/favorites")
            .set(auth(shopper))
            .send({ store_id: storeId })
        ).status,
      ).toBe(404);

      await db.query("UPDATE users SET is_suspended = false WHERE id = $1", [
        owner.id,
      ]);
      await db.query("UPDATE products SET is_published = false WHERE id = $1", [
        productId,
      ]);
      expect(
        (
          await request(app)
            .post("/favorites")
            .set(auth(shopper))
            .send({ product_id: productId })
        ).status,
      ).toBe(404);
    });

    it(`stops at ${FAVORITES_MAX} favorites`, async () => {
      // Bulk-create stores directly: one favorite target per store.
      await db.query(
        `INSERT INTO stores (owner_id, name, address, latitude, longitude, timezone, opening_hours)
         SELECT $1, 'Bulk ' || g, 'x', 35, 33, 'UTC', '{}' FROM generate_series(1, $2) g`,
        [owner.id, FAVORITES_MAX],
      );
      await db.query(
        `INSERT INTO favorites (user_id, store_id)
         SELECT $1, id FROM stores WHERE owner_id = $2 AND name LIKE 'Bulk %' LIMIT $3`,
        [shopper.id, owner.id, FAVORITES_MAX],
      );
      const res = await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(new RegExp(String(FAVORITES_MAX)));

      // Saving something already saved still works at the cap.
      const bulk = await db.query(
        "SELECT store_id FROM favorites WHERE user_id = $1 LIMIT 1",
        [shopper.id],
      );
      const again = await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: bulk.rows[0].store_id });
      expect(again.status).toBe(200);
      await db.query(
        "DELETE FROM stores WHERE owner_id = $1 AND name LIKE 'Bulk %'",
        [owner.id],
      );
    });
  });

  describe("GET /favorites", () => {
    it("is empty for a new user", async () => {
      const res = await request(app).get("/favorites").set(auth(shopper));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("returns display-ready store and product details, newest first", async () => {
      await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      await new Promise((r) => setTimeout(r, 15));
      await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ product_id: productId });

      const res = await request(app).get("/favorites").set(auth(shopper));
      expect(res.body.data.map((f: any) => f.type)).toEqual([
        "product",
        "store",
      ]);

      const [product, store] = res.body.data;
      expect(product.product).toEqual({
        id: productId,
        name: "Fav Milk",
        price: 2.5,
        image_url: IMG,
        in_stock: true,
        store_id: storeId,
        store_name: "Fav Store",
      });
      expect(store.store).toMatchObject({
        id: storeId,
        name: "Fav Store",
        is_open: true,
        rating: 0,
        review_count: 0,
      });
    });

    it("includes the community rating for stores", async () => {
      await db.query(
        "INSERT INTO reviews (user_id, store_id, rating) VALUES ($1, $3, 5), ($2, $3, 4)",
        [shopper.id, other.id, storeId],
      );
      await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      const res = await request(app).get("/favorites").set(auth(shopper));
      expect(res.body.data[0].store).toMatchObject({
        rating: 4.5,
        review_count: 2,
      });
      await db.query("DELETE FROM reviews WHERE store_id = $1", [storeId]);
    });

    it("reports a sold-out product as not in stock", async () => {
      await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ product_id: productId });
      await db.query("UPDATE products SET quantity = 0 WHERE id = $1", [
        productId,
      ]);
      const res = await request(app).get("/favorites").set(auth(shopper));
      expect(res.body.data[0].product.in_stock).toBe(false);
      await db.query("UPDATE products SET quantity = 3 WHERE id = $1", [
        productId,
      ]);
    });

    it("filters by type and rejects an unknown type", async () => {
      await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ product_id: productId });
      const stores = await request(app)
        .get("/favorites")
        .query({ type: "store" })
        .set(auth(shopper));
      expect(stores.body.data.map((f: any) => f.type)).toEqual(["store"]);
      const products = await request(app)
        .get("/favorites")
        .query({ type: "product" })
        .set(auth(shopper));
      expect(products.body.data.map((f: any) => f.type)).toEqual(["product"]);
      expect(
        (
          await request(app)
            .get("/favorites")
            .query({ type: "bogus" })
            .set(auth(shopper))
        ).status,
      ).toBe(400);
    });

    it("only returns the caller's own favorites", async () => {
      await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      const res = await request(app).get("/favorites").set(auth(other));
      expect(res.body.data).toEqual([]);
    });

    it("hides favorites that became invisible and restores them when they return", async () => {
      await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ product_id: productId });

      await db.query("UPDATE products SET is_published = false WHERE id = $1", [
        productId,
      ]);
      let res = await request(app).get("/favorites").set(auth(shopper));
      expect(res.body.data.map((f: any) => f.type)).toEqual(["store"]);

      await db.query("UPDATE users SET is_suspended = true WHERE id = $1", [
        owner.id,
      ]);
      res = await request(app).get("/favorites").set(auth(shopper));
      expect(res.body.data).toEqual([]); // owner suspension hides the store and its products

      await db.query("UPDATE users SET is_suspended = false WHERE id = $1", [
        owner.id,
      ]);
      await db.query("UPDATE products SET is_published = true WHERE id = $1", [
        productId,
      ]);
      res = await request(app).get("/favorites").set(auth(shopper));
      expect(res.body.data).toHaveLength(2); // the favorite rows were never deleted
    });
  });

  describe("DELETE /favorites/:id", () => {
    it("removes the caller's favorite", async () => {
      const created = await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      const res = await request(app)
        .delete(`/favorites/${created.body.data.id}`)
        .set(auth(shopper));
      expect(res.status).toBe(204);
      expect(
        (await request(app).get("/favorites").set(auth(shopper))).body.data,
      ).toEqual([]);
    });

    it("cannot remove someone else's favorite, and says it doesn't exist", async () => {
      const created = await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      const res = await request(app)
        .delete(`/favorites/${created.body.data.id}`)
        .set(auth(other));
      expect(res.status).toBe(404);
      expect(
        (await request(app).get("/favorites").set(auth(shopper))).body.data,
      ).toHaveLength(1);
    });

    it("404s for unknown or malformed ids and a second delete", async () => {
      expect(
        (await request(app).delete(`/favorites/${UNKNOWN}`).set(auth(shopper)))
          .status,
      ).toBe(404);
      expect(
        (await request(app).delete("/favorites/not-a-uuid").set(auth(shopper)))
          .status,
      ).toBe(404);
      const created = await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: storeId });
      await request(app)
        .delete(`/favorites/${created.body.data.id}`)
        .set(auth(shopper));
      expect(
        (
          await request(app)
            .delete(`/favorites/${created.body.data.id}`)
            .set(auth(shopper))
        ).status,
      ).toBe(404);
    });
  });

  describe("cleanup", () => {
    it("favorites vanish when the store is deleted", async () => {
      const temp = await createTestStore(owner.id, "Temp Fav Store");
      await request(app)
        .post("/favorites")
        .set(auth(shopper))
        .send({ store_id: temp });
      await db.query("DELETE FROM stores WHERE id = $1", [temp]);
      expect(
        (await db.query("SELECT 1 FROM favorites WHERE store_id = $1", [temp]))
          .rowCount,
      ).toBe(0);
    });
  });
});
