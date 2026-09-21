import { db } from "@/config/database";
import { generateMockToken } from "@/utils/testAuth";
import request from "supertest";
import { app } from "../../app";

describe("Product Freshness API Integration", () => {
  let storeId: string;
  let productId: string;
  let otherStoreId: string;
  let ownerToken: string;

  beforeAll(async () => {
    // 1. Setup mock user
    const userRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role) 
       VALUES ('owner@test.com', 'hash', 'Test Owner', 'STORE_OWNER') RETURNING id`,
    );
    const userId = userRes.rows[0].id;
    ownerToken = generateMockToken({ id: userId, role: "STORE_OWNER" });

    // 2. Setup mock stores
    const storeRes = await db.query(
      `INSERT INTO stores (owner_id, name, address, latitude, longitude, timezone, opening_hours) 
       VALUES ($1, 'Fresh Store', '123 Test', 0, 0, 'UTC', '{}') RETURNING id`,
      [userId],
    );
    storeId = storeRes.rows[0].id;

    const otherStoreRes = await db.query(
      `INSERT INTO stores (owner_id, name, address, latitude, longitude, timezone, opening_hours) 
       VALUES ($1, 'Other Store', '456 Test', 0, 0, 'UTC', '{}') RETURNING id`,
      [userId],
    );
    otherStoreId = otherStoreRes.rows[0].id;

    // 3. Setup mock product with an old last_verified_at date
    const productRes = await db.query(
      `INSERT INTO products (store_id, name, price, quantity, is_published, image_url, last_verified_at) 
       VALUES ($1, 'Test Product', 9.99, 5, true, 'https://cdn.nearcommerce.test/test.jpg', NOW() - INTERVAL '40 days') RETURNING id`,
      [storeId],
    );
    productId = productRes.rows[0].id;
  });

  afterAll(async () => {
    await db.query(`DELETE FROM users WHERE email = 'owner@test.com'`);
    await db.end();
  });

  it("should return 400 if X-Store-ID is missing", async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/verify`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Missing X-Store-ID header/);
  });

  it("should return 404 if X-Store-ID does not match the product store", async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/verify`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Store-ID", otherStoreId);

    expect(res.status).toBe(404);
  });

  it("should update last_verified_at and return 200 when successful", async () => {
    const res = await request(app)
      .patch(`/api/products/${productId}/verify`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .set("X-Store-ID", storeId);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("last_verified_at");

    // Verify the date is recent
    const updatedDate = new Date(res.body.data.last_verified_at);
    const now = new Date();
    expect(now.getTime() - updatedDate.getTime()).toBeLessThan(5000); // within 5 seconds
  });
});
