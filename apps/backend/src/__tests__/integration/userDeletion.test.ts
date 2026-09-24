import { app } from "@/app";
import { db } from "@/config/database";
import { generateMockToken } from "@/utils/testAuth";
import request from "supertest";

describe("User Account Deletion & Orphan Prevention (/users/me)", () => {
  let customerId: string;
  let customerToken: string;
  let otherUserId: string;
  let adminId: string;
  let adminToken: string;

  beforeEach(async () => {
    // Clean up
    await db.query("DELETE FROM household_lists");
    await db.query("DELETE FROM users WHERE email LIKE '%@test-delete.com'");

    // Create a normal customer
    const userRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ('customer@test-delete.com', 'hashed', 'Test Customer', 'CUSTOMER')
       RETURNING id, role`,
    );
    customerId = userRes.rows[0].id;
    customerToken = generateMockToken({ id: customerId, role: "CUSTOMER" });

    // Create another user
    const otherRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ('other@test-delete.com', 'hashed', 'Other User', 'CUSTOMER')
       RETURNING id, role`,
    );
    otherUserId = otherRes.rows[0].id;

    // Create an admin
    const adminRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ('admin@test-delete.com', 'hashed', 'Admin User', 'SYSTEM_ADMIN')
       RETURNING id, role`,
    );
    adminId = adminRes.rows[0].id;
    adminToken = generateMockToken({ id: adminId, role: "SYSTEM_ADMIN" });
  });

  afterAll(async () => {
    await db.query("DELETE FROM household_lists");
    await db.query("DELETE FROM users WHERE email LIKE '%@test-delete.com'");
  });

  it("should prevent SYSTEM_ADMIN from self-deleting", async () => {
    const res = await request(app)
      .delete("/users/me")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain(
      "SYSTEM_ADMIN cannot self-delete. Account must be demoted first.",
    );
  });

  it("should delete household list if the deleting user was the lone member", async () => {
    // Create lone list
    const listRes = await db.query(
      `INSERT INTO household_lists (name, invite_code) VALUES ('Lone List', 'LONE123') RETURNING id`,
    );
    const listId = listRes.rows[0].id;
    await db.query(
      `INSERT INTO household_list_members (list_id, user_id, role) VALUES ($1, $2, 'OWNER')`,
      [listId, customerId],
    );

    const res = await request(app)
      .delete("/users/me")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Account successfully deleted.");

    // Check user is deleted
    const checkUser = await db.query("SELECT * FROM users WHERE id = $1", [
      customerId,
    ]);
    expect(checkUser.rows.length).toBe(0);

    // Check list is deleted
    const checkList = await db.query(
      "SELECT * FROM household_lists WHERE id = $1",
      [listId],
    );
    expect(checkList.rows.length).toBe(0);
  });

  it("should transfer list ownership to the oldest member if other members exist", async () => {
    // Create shared list
    const listRes = await db.query(
      `INSERT INTO household_lists (name, invite_code) VALUES ('Shared List', 'SHARE123') RETURNING id`,
    );
    const listId = listRes.rows[0].id;
    await db.query(
      `INSERT INTO household_list_members (list_id, user_id, role, joined_at)
       VALUES ($1, $2, 'OWNER', NOW() - INTERVAL '2 days')`,
      [listId, customerId],
    );
    await db.query(
      `INSERT INTO household_list_members (list_id, user_id, role, joined_at)
       VALUES ($1, $2, 'MEMBER', NOW() - INTERVAL '1 day')`,
      [listId, otherUserId],
    );

    const res = await request(app)
      .delete("/users/me")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);

    // Check list still exists
    const checkList = await db.query(
      "SELECT * FROM household_lists WHERE id = $1",
      [listId],
    );
    expect(checkList.rows.length).toBe(1);

    // Check other member is now OWNER
    const checkMember = await db.query(
      "SELECT role FROM household_list_members WHERE list_id = $1 AND user_id = $2",
      [listId, otherUserId],
    );
    expect(checkMember.rows.length).toBe(1);
    expect(checkMember.rows[0].role).toBe("OWNER");
  });
});
