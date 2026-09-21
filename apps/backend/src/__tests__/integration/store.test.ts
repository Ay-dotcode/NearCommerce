import { app } from "@/app";
import { db } from "@/config/database";
import request from "supertest";

describe("Store Detail API Integration", () => {
  let activeStoreId: string;
  let suspendedStoreId: string;
  let testOwnerId: string;

  beforeAll(async () => {
    // 0. Ensure a test owner user exists
    const userRes = await db.query(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ('store-test-owner@nearcommerce.test', 'hashed_pw', 'Store Test Owner', 'STORE_OWNER')
      ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
    `);
    testOwnerId = userRes.rows[0].id;

    // 1. Setup mock stores directly in the test DB
    const activeRes = await db.query(
      `INSERT INTO stores (owner_id, name, address, latitude, longitude, timezone, opening_hours, is_suspended) 
       VALUES ($1, 'Active Store', '123 Main St', 40.71, -74.00, 'America/New_York', '{"monday": {"open": "00:00", "close": "23:59"}}', false) RETURNING id`,
      [testOwnerId],
    );
    activeStoreId = activeRes.rows[0].id;

    const suspendedRes = await db.query(
      `INSERT INTO stores (owner_id, name, address, latitude, longitude, timezone, opening_hours, is_suspended) 
       VALUES ($1, 'Suspended Store', '456 Bad St', 40.71, -74.00, 'America/New_York', '{"monday": {"open": "00:00", "close": "23:59"}}', true) RETURNING id`,
      [testOwnerId],
    );
    suspendedStoreId = suspendedRes.rows[0].id;
  });

  afterAll(async () => {
    if (activeStoreId && suspendedStoreId)
      await db.query(`DELETE FROM stores WHERE id IN ($1, $2)`, [
        activeStoreId,
        suspendedStoreId,
      ]);
    if (testOwnerId)
      await db.query("DELETE FROM users WHERE id = $1", [testOwnerId]);
    await db.end();
  });

  it("should return 200 and include is_open_now for an active store", async () => {
    const res = await request(app).get(`/api/stores/${activeStoreId}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("is_open_now");
    expect(typeof res.body.data.is_open_now).toBe("boolean");
  });

  it("should return 404 for a suspended store, ignoring direct ID lookups", async () => {
    const res = await request(app).get(`/api/stores/${suspendedStoreId}`);
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/Store not found or suspended/);
  });
});
