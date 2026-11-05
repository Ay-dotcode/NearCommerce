import {
  cleanupFixtures,
  createTestProduct,
  createTestStore,
  createTestUser,
  TestUser,
} from "@/__tests__/helpers/fixtures";
import { app } from "@/app";
import { db } from "@/config/database";
import request from "supertest";

jest.setTimeout(30000);

// A published product must have a picture.
const IMAGE = "https://example.com/photo.jpg";

// Which store sells a reviewed product, and what a store owner can see about the reviews on their
// own products.
describe("Reviews of products: the selling store, and the owner's view", () => {
  let owner: TestUser;
  let otherOwner: TestUser;
  let admin: TestUser;
  let alice: TestUser;
  let bob: TestUser;
  let storeId: string;
  let otherStoreId: string;
  let milk: string;
  let bread: string;
  let tea: string;

  const as = (u: TestUser) => ({ Authorization: `Bearer ${u.token}` });
  const review = async (
    user: TestUser,
    target: { productId?: string; storeId?: string },
    rating: number,
    comment: string,
    minutesAgo: number,
  ) =>
    db.query(
      `INSERT INTO reviews (user_id, product_id, store_id, rating, comment, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW() - ($6 || ' minutes')::interval)`,
      [
        user.id,
        target.productId ?? null,
        target.storeId ?? null,
        rating,
        comment,
        String(minutesAgo),
      ],
    );
  const ownerReviews = (u: TestUser, id: string, query = "") =>
    request(app).get(`/api/stores/${id}/product-reviews${query}`).set(as(u));

  beforeAll(async () => {
    owner = await createTestUser("STORE_OWNER");
    otherOwner = await createTestUser("STORE_OWNER");
    admin = await createTestUser("SYSTEM_ADMIN");
    alice = await createTestUser("CUSTOMER");
    bob = await createTestUser("CUSTOMER");
    await db.query(`UPDATE users SET full_name = 'Alice Wonderland' WHERE id = $1`, [alice.id]);
    await db.query(`UPDATE users SET full_name = 'Bob' WHERE id = $1`, [bob.id]);

    storeId = await createTestStore(owner.id, "Corner Market");
    otherStoreId = await createTestStore(otherOwner.id, "Tea House");
    milk = await createTestProduct(storeId, { name: "Fresh Milk", isPublished: true, imageUrl: IMAGE });
    bread = await createTestProduct(storeId, { name: "Sourdough", isPublished: true, imageUrl: IMAGE });
    tea = await createTestProduct(otherStoreId, { name: "Green Tea", isPublished: true, imageUrl: IMAGE });

    await review(alice, { productId: milk }, 5, "Very fresh", 30);
    await review(bob, { productId: milk }, 3, "Okay", 20);
    await review(alice, { productId: bread }, 4, "Crusty", 10);
    await review(alice, { storeId }, 2, "Slow service", 5); // about the store, not a product
    await review(bob, { productId: tea }, 1, "Weak", 1); // someone else's product
  });

  afterAll(async () => {
    await db.query(`DELETE FROM reviews WHERE user_id = ANY($1::uuid[])`, [[alice.id, bob.id]]);
    await cleanupFixtures();
    await db.end();
  });

  describe("the store that sells the reviewed product is shown", () => {
    it("on the public reviews of a product", async () => {
      const res = await request(app).get(`/api/reviews?product_id=${milk}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      for (const r of res.body.data) expect(r.store_name).toBe("Corner Market");
    });

    it("has no selling store on a review of a store (the store is the target)", async () => {
      const res = await request(app).get(`/api/reviews?store_id=${storeId}`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].store_name).toBeNull();
    });

    it("on a shopper's own reviews", async () => {
      const res = await request(app).get("/api/reviews/mine").set(as(alice));
      expect(res.status).toBe(200);
      const byTarget = Object.fromEntries(
        res.body.data.map((r: { target_name: string; store_name: string | null }) => [
          r.target_name,
          r.store_name,
        ]),
      );
      expect(byTarget["Fresh Milk"]).toBe("Corner Market");
      expect(byTarget["Sourdough"]).toBe("Corner Market");
      expect(byTarget["Corner Market"]).toBeNull();
    });

    it("on the admin's list of reviews", async () => {
      const res = await request(app).get("/api/admin/reviews?limit=100").set(as(admin));
      expect(res.status).toBe(200);
      const find = (name: string) =>
        res.body.data.find((r: { target_name: string }) => r.target_name === name);
      expect(find("Fresh Milk")).toMatchObject({ target_type: "PRODUCT", store_name: "Corner Market" });
      expect(find("Green Tea")).toMatchObject({ store_name: "Tea House" });
    });
  });

  describe("GET /stores/:storeId/product-reviews (the owner's view)", () => {
    it("lists the reviews on the store's own products, newest first", async () => {
      const res = await ownerReviews(owner, storeId);
      expect(res.status).toBe(200);
      expect(res.body.data.map((r: { comment: string }) => r.comment)).toEqual([
        "Crusty",
        "Okay",
        "Very fresh",
      ]);
      expect(res.body.data[0]).toMatchObject({
        product_id: bread,
        product_name: "Sourdough",
        rating: 4,
        reviewer_name: "Alice W.",
      });
    });

    it("leaves out reviews of the store itself and of other stores' products", async () => {
      const res = await ownerReviews(owner, storeId);
      const comments = res.body.data.map((r: { comment: string }) => r.comment);
      expect(comments).not.toContain("Slow service");
      expect(comments).not.toContain("Weak");
    });

    it("does not repeat the store name, and never exposes reviewers' emails", async () => {
      const res = await ownerReviews(owner, storeId);
      const body = JSON.stringify(res.body);
      expect(body).not.toContain("store_name");
      expect(body).not.toContain("@fixtures.test");
      expect(body).not.toContain("Wonderland");
    });

    it("summarises all the store's product reviews", async () => {
      const res = await ownerReviews(owner, storeId);
      expect(res.body.summary).toEqual({
        rating: 4, // (5 + 3 + 4) / 3
        review_count: 3,
        distribution: { "1": 0, "2": 0, "3": 1, "4": 1, "5": 1 },
      });
      expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 3 });
    });

    it("can be narrowed to one product, and paged", async () => {
      const one = await ownerReviews(owner, storeId, `?product_id=${milk}`);
      expect(one.body.data).toHaveLength(2);
      expect(one.body.summary).toMatchObject({ review_count: 2, rating: 4 });

      const page2 = await ownerReviews(owner, storeId, "?limit=1&page=2");
      expect(page2.body.data.map((r: { comment: string }) => r.comment)).toEqual(["Okay"]);
      expect(page2.body.pagination).toEqual({ page: 2, limit: 1, total: 3 });
    });

    it("is empty, not an error, for a store whose products have no reviews", async () => {
      const lonely = await createTestStore(owner.id, "Brand New Shop");
      const res = await ownerReviews(owner, lonely);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.summary).toMatchObject({ rating: 0, review_count: 0 });
    });

    it("is only for the store's own owner", async () => {
      expect((await ownerReviews(otherOwner, storeId)).status).toBe(403);
      expect((await ownerReviews(alice, storeId)).status).toBe(403);
      expect((await request(app).get(`/api/stores/${storeId}/product-reviews`)).status).toBe(401);
    });

    it("rejects bad input", async () => {
      expect((await ownerReviews(owner, storeId, "?product_id=nope")).status).toBe(400);
      expect((await ownerReviews(owner, storeId, "?limit=0")).status).toBe(400);
      expect((await ownerReviews(owner, "not-a-uuid")).status).toBe(400);
    });
  });
});
