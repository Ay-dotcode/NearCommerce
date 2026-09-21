import { app } from "@/app";
import { db } from "@/config/database";
import { generateMockToken, generateMockUserWithRole } from "@/utils/testAuth";
import request from "supertest";

describe("System Admin Operations safeguards", () => {
  let adminId: string;
  let adminToken: string;
  let customerId: string;
  let customerToken: string;
  let targetStoreId: string;

  beforeAll(async () => {
    const admin = await generateMockUserWithRole("SYSTEM_ADMIN", "ops_admin");
    adminId = admin.id;
    adminToken = generateMockToken(admin);

    const customer = await generateMockUserWithRole("CUSTOMER", "ops_customer");
    customerId = customer.id;
    customerToken = generateMockToken(customer);

    const store = await db.query(
      `INSERT INTO stores (owner_id, name, address, latitude, longitude, timezone, opening_hours)
       VALUES ($1, 'Admin Test Store', '123 Admin Ave', 0, 0, 'UTC', '{}')
       RETURNING id`,
      [customerId],
    );
    targetStoreId = store.rows[0].id;
  });

  afterAll(async () => {
    await db.query("DELETE FROM admin_audit_logs WHERE admin_id = $1", [
      adminId,
    ]);
    await db.query("DELETE FROM stores WHERE id = $1", [targetStoreId]);
    await db.query("DELETE FROM users WHERE id IN ($1, $2)", [
      adminId,
      customerId,
    ]);
  });

  it("rejects non-system-admin requests", async () => {
    const response = await request(app)
      .get("/api/admin/users")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(response.status).toBe(403);
  });

  it("blocks deleting another active system admin", async () => {
    const otherAdmin = await generateMockUserWithRole(
      "SYSTEM_ADMIN",
      "other_admin",
    );
    try {
      const response = await request(app)
        .delete(`/api/admin/users/${otherAdmin.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ reason: "Administrative cleanup" });

      expect(response.status).toBe(409);
      const user = await db.query("SELECT id FROM users WHERE id = $1", [
        otherAdmin.id,
      ]);
      expect(user.rows).toHaveLength(1);
    } finally {
      await db.query("DELETE FROM users WHERE id = $1", [otherAdmin.id]);
    }
  });

  it("audits the serialized store before hard deletion", async () => {
    const response = await request(app)
      .delete(`/api/admin/stores/${targetStoreId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Policy violation" });

    expect(response.status).toBe(200);
    const audit = await db.query(
      `SELECT snapshot, reason FROM admin_audit_logs
       WHERE target_id = $1 AND action = 'DELETE_STORE'`,
      [targetStoreId],
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0].snapshot).toHaveProperty("id", targetStoreId);
    expect(audit.rows[0].reason).toBe("Policy violation");
  });
});
