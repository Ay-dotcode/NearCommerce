import { db } from "@/config/database";
import redisClient from "@/config/redis";
import { generateMockToken, generateMockUserWithRole } from "@/utils/testAuth";
import request from "supertest";
import { app } from "../../app";

jest.mock("@/config/redis", () => ({
  __esModule: true,
  default: {
    del: jest.fn(),
    isOpen: true,
    get: jest.fn(),
  },
  connectRedis: jest.fn(),
}));

describe("System Admin Operations API Integration", () => {
  let adminToken: string;
  let customerToken: string;
  let adminId: string;
  let customerId: string;
  let targetStoreId: string;

  beforeAll(async () => {
    // 1. Create SYSTEM_ADMIN and CUSTOMER via test helpers
    const admin = await generateMockUserWithRole("SYSTEM_ADMIN", "admin");
    adminId = admin.id;
    adminToken = generateMockToken(admin);

    const customer = await generateMockUserWithRole("CUSTOMER", "customer");
    customerId = customer.id;
    customerToken = generateMockToken(customer);

    // 2. Create a mock store to manage
    const storeRes = await db.query(
      `INSERT INTO stores (owner_id, name, address, latitude, longitude, timezone, opening_hours) 
       VALUES ($1, 'Target Store', '123 Admin Ave', 0, 0, 'UTC', '{}') RETURNING id`,
      [customer.id],
    );
    targetStoreId = storeRes.rows[0].id;
  });

  afterAll(async () => {
    await db.query(`DELETE FROM admin_audit_logs WHERE target_id = $1`, [
      targetStoreId,
    ]);
    await db.query(`DELETE FROM stores WHERE id = $1`, [targetStoreId]);
    if (adminId && customerId)
      await db.query(`DELETE FROM users WHERE id IN ($1, $2)`, [
        adminId,
        customerId,
      ]);
    await db.end();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should deny access to non-admins", async () => {
    const res = await request(app)
      .patch(`/api/admin/stores/${targetStoreId}/suspension`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ is_suspended: true });

    expect(res.status).toBe(403);
  });

  it("should allow admin to suspend a store, busting redis cache and logging the action", async () => {
    const res = await request(app)
      .patch(`/api/admin/stores/${targetStoreId}/suspension`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ is_suspended: true, reason: "Violated terms" });

    expect(res.status).toBe(200);
    expect(res.body.data.is_suspended).toBe(true);

    // Verify Redis cache bust
    expect(redisClient.del).toHaveBeenCalledWith(
      expect.stringContaining(`suspended:`),
    );

    // Verify audit log creation
    const logRes = await db.query(
      `SELECT * FROM admin_audit_logs WHERE target_id = $1`,
      [targetStoreId],
    );
    expect(logRes.rows.length).toBe(1);
    expect(logRes.rows[0].action).toBe("SUSPEND_STORE");
  });

  it("should hard delete a store and save a snapshot in the audit log", async () => {
    const res = await request(app)
      .delete(`/api/admin/stores/${targetStoreId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Spam store" });

    expect(res.status).toBe(200);

    // Verify store is deleted
    const storeCheck = await db.query(`SELECT id FROM stores WHERE id = $1`, [
      targetStoreId,
    ]);
    expect(storeCheck.rows.length).toBe(0);

    // Verify snapshot was created
    const logRes = await db.query(
      `SELECT * FROM admin_audit_logs WHERE action = 'DELETE_STORE' AND target_id = $1`,
      [targetStoreId],
    );
    expect(logRes.rows.length).toBe(1);
    expect(logRes.rows[0].snapshot).toHaveProperty("name", "Target Store");
  });
});
