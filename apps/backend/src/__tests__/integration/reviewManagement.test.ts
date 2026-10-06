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

describe("Reviews: list, edit and delete", () => {
  let owner: TestUser;
  let alice: TestUser;
  let bob: TestUser;
  let storeId: string;
  let productId: string;

  const bearer = (u: TestUser) => `Bearer ${u.token}`;

  const review = (u: TestUser, body: object) =>
    request(app)
      .post("/api/reviews")
      .set("Authorization", bearer(u))
      .send(body);

  beforeAll(async () => {
    owner = await createTestUser("STORE_OWNER");
    alice = await createTestUser("CUSTOMER");
    bob = await createTestUser("CUSTOMER");
    await db.query(
      `UPDATE users SET full_name = 'Alice Wonderland' WHERE id = $1`,
      [alice.id],
    );
    await db.query(`UPDATE users SET full_name = 'Bob' WHERE id = $1`, [
      bob.id,
    ]);
    storeId = await createTestStore(owner.id, "Reviewed Store");
    productId = await createTestProduct(storeId, {
      name: "Reviewed Product",
      isPublished: true,
      imageUrl: "https://example.com/p.png",
    });
  });

  beforeEach(async () => {
    await db.query(
      `DELETE FROM reviews WHERE store_id = $1 OR product_id = $2`,
      [storeId, productId],
    );
    await db.query(`UPDATE stores SET is_suspended = false WHERE id = $1`, [
      storeId,
    ]);
    await db.query(`UPDATE users SET is_suspended = false WHERE id = $1`, [
      owner.id,
    ]);
  });

  afterAll(async () => {
    await cleanupFixtures();
    await db.end();
  });

  describe("POST /reviews", () => {
    it("creates a store review and trims the comment", async () => {
      const res = await review(alice, {
        storeId,
        rating: 4,
        comment: "  Nice  ",
      });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        rating: 4,
        comment: "Nice",
        updated_at: null,
      });
    });

    it("rejects a review for a hidden store with 404", async () => {
      await db.query(`UPDATE stores SET is_suspended = true WHERE id = $1`, [
        storeId,
      ]);
      const res = await review(alice, { storeId, rating: 4 });
      expect(res.status).toBe(404);
    });

    it("rejects a review for a suspended owner's product with 404", async () => {
      await db.query(`UPDATE users SET is_suspended = true WHERE id = $1`, [
        owner.id,
      ]);
      const res = await review(alice, { productId, rating: 4 });
      expect(res.status).toBe(404);
    });

    it("rejects an unpublished product", async () => {
      const draft = await createTestProduct(storeId, { name: "Draft" });
      const res = await review(alice, { productId: draft, rating: 4 });
      expect(res.status).toBe(404);
    });

    it("validates target, rating and comment length", async () => {
      expect((await review(alice, { rating: 4 })).status).toBe(400);
      expect(
        (await review(alice, { storeId, productId, rating: 4 })).status,
      ).toBe(400);
      expect((await review(alice, { storeId, rating: 4.5 })).status).toBe(400);
      expect((await review(alice, { storeId, rating: 0 })).status).toBe(400);
      const long = await review(alice, {
        storeId,
        rating: 4,
        comment: "x".repeat(1001),
      });
      expect(long.status).toBe(400);
      expect(long.body.error).toMatch(/1000 characters/);
    });

    it("requires sign-in and blocks a second review of the same target", async () => {
      expect(
        (await request(app).post("/api/reviews").send({ storeId, rating: 4 }))
          .status,
      ).toBe(401);
      await review(alice, { storeId, rating: 4 });
      expect((await review(alice, { storeId, rating: 5 })).status).toBe(409);
    });
  });

  describe("GET /reviews", () => {
    it("lists a store's reviews newest first with a rating summary", async () => {
      await review(alice, { storeId, rating: 5, comment: "Great" });
      await review(bob, { storeId, rating: 2 });

      const res = await request(app).get(`/api/reviews?store_id=${storeId}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.summary).toEqual({
        rating: 3.5,
        review_count: 2,
        distribution: { "1": 0, "2": 1, "3": 0, "4": 0, "5": 1 },
      });
      expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 2 });
    });

    it("shows only a first name and last initial, never the email or user id", async () => {
      await review(alice, { storeId, rating: 5 });
      await review(bob, { storeId, rating: 4 });
      const res = await request(app).get(`/api/reviews?store_id=${storeId}`);
      const names = res.body.data.map(
        (r: { reviewer_name: string }) => r.reviewer_name,
      );
      expect(names.sort()).toEqual(["Alice W.", "Bob"]);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain("@fixtures.test");
      expect(text).not.toContain(alice.id);
    });

    it("marks the viewer's own review with is_mine", async () => {
      await review(alice, { storeId, rating: 5 });
      await review(bob, { storeId, rating: 4 });

      const anon = await request(app).get(`/api/reviews?store_id=${storeId}`);
      expect(
        anon.body.data.every((r: { is_mine: boolean }) => !r.is_mine),
      ).toBe(true);

      const asAlice = await request(app)
        .get(`/api/reviews?store_id=${storeId}`)
        .set("Authorization", bearer(alice));
      const mine = asAlice.body.data.filter(
        (r: { is_mine: boolean }) => r.is_mine,
      );
      expect(mine).toHaveLength(1);
      expect(mine[0].reviewer_name).toBe("Alice W.");
    });

    it("treats a bad token on the public list as signed out", async () => {
      const res = await request(app)
        .get(`/api/reviews?store_id=${storeId}`)
        .set("Authorization", "Bearer not-a-token");
      expect(res.status).toBe(200);
    });

    it("lists product reviews and paginates", async () => {
      await review(alice, { productId, rating: 5 });
      await review(bob, { productId, rating: 3 });
      const res = await request(app).get(
        `/api/reviews?product_id=${productId}&limit=1&page=2`,
      );
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.pagination).toEqual({ page: 2, limit: 1, total: 2 });
    });

    it("returns an empty summary when there are no reviews", async () => {
      const res = await request(app).get(`/api/reviews?store_id=${storeId}`);
      expect(res.body.data).toEqual([]);
      expect(res.body.summary.rating).toBe(0);
      expect(res.body.summary.review_count).toBe(0);
    });

    it("hides reviews of suspended stores and suspended owners", async () => {
      await db.query(`UPDATE stores SET is_suspended = true WHERE id = $1`, [
        storeId,
      ]);
      expect(
        (await request(app).get(`/api/reviews?store_id=${storeId}`)).status,
      ).toBe(404);
      await db.query(`UPDATE stores SET is_suspended = false WHERE id = $1`, [
        storeId,
      ]);
      await db.query(`UPDATE users SET is_suspended = true WHERE id = $1`, [
        owner.id,
      ]);
      expect(
        (await request(app).get(`/api/reviews?product_id=${productId}`)).status,
      ).toBe(404);
    });

    it("validates the query", async () => {
      expect((await request(app).get("/api/reviews")).status).toBe(400);
      expect(
        (
          await request(app).get(
            `/api/reviews?store_id=${storeId}&product_id=${productId}`,
          )
        ).status,
      ).toBe(400);
      expect(
        (await request(app).get("/api/reviews?store_id=nope")).status,
      ).toBe(400);
      expect(
        (await request(app).get(`/api/reviews?store_id=${storeId}&limit=500`))
          .status,
      ).toBe(400);
    });
  });

  describe("GET /reviews/mine", () => {
    it("lists only my reviews with target names", async () => {
      await review(alice, { storeId, rating: 5, comment: "Mine" });
      await review(alice, { productId, rating: 3 });
      await review(bob, { storeId, rating: 1 });

      const res = await request(app)
        .get("/api/reviews/mine")
        .set("Authorization", bearer(alice));
      expect(res.status).toBe(200);
      expect(res.body.pagination.total).toBe(2);
      const byType = Object.fromEntries(
        res.body.data.map((r: { target_type: string }) => [r.target_type, r]),
      );
      expect(byType.STORE).toMatchObject({
        target_name: "Reviewed Store",
        store_id: storeId,
      });
      expect(byType.PRODUCT).toMatchObject({
        target_name: "Reviewed Product",
        product_store_id: storeId,
      });
    });

    it("requires sign-in", async () => {
      expect((await request(app).get("/api/reviews/mine")).status).toBe(401);
    });
  });

  describe("PATCH /reviews/:id", () => {
    it("edits rating and comment and records the edit time", async () => {
      const created = await review(alice, {
        storeId,
        rating: 2,
        comment: "Meh",
      });
      const id = created.body.data.id;

      const res = await request(app)
        .patch(`/api/reviews/${id}`)
        .set("Authorization", bearer(alice))
        .send({ rating: 5, comment: "Much better" });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id,
        rating: 5,
        comment: "Much better",
      });
      expect(res.body.data.updated_at).not.toBeNull();
    });

    it("updates one field without touching the other, and can clear the comment", async () => {
      const created = await review(alice, {
        storeId,
        rating: 2,
        comment: "Keep me",
      });
      const id = created.body.data.id;
      const ratingOnly = await request(app)
        .patch(`/api/reviews/${id}`)
        .set("Authorization", bearer(alice))
        .send({ rating: 4 });
      expect(ratingOnly.body.data).toMatchObject({
        rating: 4,
        comment: "Keep me",
      });

      const cleared = await request(app)
        .patch(`/api/reviews/${id}`)
        .set("Authorization", bearer(alice))
        .send({ comment: null });
      expect(cleared.body.data).toMatchObject({ rating: 4, comment: null });
    });

    it("cannot edit someone else's review", async () => {
      const created = await review(alice, {
        storeId,
        rating: 2,
        comment: "Alice's",
      });
      const res = await request(app)
        .patch(`/api/reviews/${created.body.data.id}`)
        .set("Authorization", bearer(bob))
        .send({ rating: 1 });
      expect(res.status).toBe(404);
      const row = await db.query(`SELECT rating FROM reviews WHERE id = $1`, [
        created.body.data.id,
      ]);
      expect(row.rows[0].rating).toBe(2);
    });

    it("validates the body and the id", async () => {
      const created = await review(alice, { storeId, rating: 2 });
      const id = created.body.data.id;
      const patch = (body: object, target = id) =>
        request(app)
          .patch(`/api/reviews/${target}`)
          .set("Authorization", bearer(alice))
          .send(body);
      expect((await patch({})).status).toBe(400);
      expect((await patch({ rating: 6 })).status).toBe(400);
      expect((await patch({ comment: "x".repeat(1001) })).status).toBe(400);
      expect((await patch({ rating: 3 }, "not-a-uuid")).status).toBe(404);
    });

    it("requires sign-in", async () => {
      const created = await review(alice, { storeId, rating: 2 });
      const res = await request(app)
        .patch(`/api/reviews/${created.body.data.id}`)
        .send({ rating: 1 });
      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /reviews/:id", () => {
    it("deletes my review and lets me review again", async () => {
      const created = await review(alice, { storeId, rating: 2 });
      const id = created.body.data.id;
      const res = await request(app)
        .delete(`/api/reviews/${id}`)
        .set("Authorization", bearer(alice));
      expect(res.status).toBe(204);
      expect((await review(alice, { storeId, rating: 5 })).status).toBe(201);
    });

    it("cannot delete someone else's review, and a second delete is 404", async () => {
      const created = await review(alice, { storeId, rating: 2 });
      const id = created.body.data.id;
      expect(
        (
          await request(app)
            .delete(`/api/reviews/${id}`)
            .set("Authorization", bearer(bob))
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app)
            .delete(`/api/reviews/${id}`)
            .set("Authorization", bearer(alice))
        ).status,
      ).toBe(204);
      expect(
        (
          await request(app)
            .delete(`/api/reviews/${id}`)
            .set("Authorization", bearer(alice))
        ).status,
      ).toBe(404);
    });

    it("updates the store's rating summary", async () => {
      const created = await review(alice, { storeId, rating: 1 });
      await review(bob, { storeId, rating: 5 });
      await request(app)
        .delete(`/api/reviews/${created.body.data.id}`)
        .set("Authorization", bearer(alice));
      const res = await request(app).get(`/api/reviews?store_id=${storeId}`);
      expect(res.body.summary).toMatchObject({ rating: 5, review_count: 1 });
    });
  });
});
