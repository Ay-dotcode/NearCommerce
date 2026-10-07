import {
  cleanupFixtures,
  createTestStore,
  createTestUser,
  TestUser,
} from "@/__tests__/helpers/fixtures";
import { app } from "@/app";
import { db } from "@/config/database";
import redisClient from "@/config/redis";
import request from "supertest";

jest.mock("@/config/redis", () => ({
  __esModule: true,
  default: {
    del: jest.fn(),
    get: jest.fn(),
    setEx: jest.fn(),
    isOpen: true,
  },
  connectRedis: jest.fn(),
}));

jest.setTimeout(30000);

describe("Admin user moderation: search, demote and force delete", () => {
  let admin: TestUser;
  let otherAdmin: TestUser;
  let customer: TestUser;
  const extraUsers: string[] = [];

  const auth = (u: TestUser) => `Bearer ${u.token}`;
  const reason = { reason: "Policy violation" };

  beforeAll(async () => {
    admin = await createTestUser("SYSTEM_ADMIN");
    otherAdmin = await createTestUser("SYSTEM_ADMIN");
    customer = await createTestUser("CUSTOMER");
  });

  beforeEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await db.query(
      `DELETE FROM admin_audit_logs WHERE admin_id = ANY($1::uuid[])`,
      [[admin.id, otherAdmin.id]],
    );
    await db.query(
      `DELETE FROM admin_audit_logs WHERE target_id = ANY($1::uuid[])`,
      [[admin.id, otherAdmin.id, customer.id, ...extraUsers]],
    );
    await cleanupFixtures();
    await db.end();
  });

  describe("GET /admin/users", () => {
    it("is admin only", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", auth(customer));
      expect(res.status).toBe(403);
    });

    it("searches name and email, case-insensitively", async () => {
      await db.query(
        `UPDATE users SET full_name = 'Zelda Findable' WHERE id = $1`,
        [customer.id],
      );
      const byName = await request(app)
        .get("/api/admin/users?q=zelda%20FIND")
        .set("Authorization", auth(admin));
      expect(byName.body.data.map((u: { id: string }) => u.id)).toContain(
        customer.id,
      );

      const byEmail = await request(app)
        .get(
          `/api/admin/users?q=${encodeURIComponent(customer.email.toUpperCase())}`,
        )
        .set("Authorization", auth(admin));
      expect(byEmail.body.data.map((u: { id: string }) => u.id)).toEqual([
        customer.id,
      ]);
      expect(byEmail.body.pagination.total).toBe(1);
    });

    it("matches % and _ literally", async () => {
      const wild = await request(app)
        .get("/api/admin/users?q=%25")
        .set("Authorization", auth(admin));
      expect(wild.body.data).toEqual([]);
    });

    it("filters by role and status and never returns password hashes", async () => {
      await db.query(`UPDATE users SET is_suspended = true WHERE id = $1`, [
        customer.id,
      ]);
      const suspended = await request(app)
        .get("/api/admin/users?status=suspended&role=CUSTOMER&q=fixtures.test")
        .set("Authorization", auth(admin));
      expect(suspended.body.data.map((u: { id: string }) => u.id)).toContain(
        customer.id,
      );
      expect(
        suspended.body.data.every(
          (u: { is_suspended: boolean; role: string }) =>
            u.is_suspended && u.role === "CUSTOMER",
        ),
      ).toBe(true);
      expect(JSON.stringify(suspended.body)).not.toContain("password_hash");

      const admins = await request(app)
        .get("/api/admin/users?role=SYSTEM_ADMIN&q=fixtures.test")
        .set("Authorization", auth(admin));
      expect(admins.body.data.map((u: { id: string }) => u.id)).toEqual(
        expect.arrayContaining([admin.id, otherAdmin.id]),
      );
      await db.query(`UPDATE users SET is_suspended = false WHERE id = $1`, [
        customer.id,
      ]);
    });

    it("rejects bad filters", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=KING")
        .set("Authorization", auth(admin));
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /admin/users/:id/demote", () => {
    const demote = (who: TestUser, targetId: string, body: object = reason) =>
      request(app)
        .patch(`/api/admin/users/${targetId}/demote`)
        .set("Authorization", auth(who))
        .send(body);

    it("demotes another admin to CUSTOMER, audits it and signs them out", async () => {
      const target = await createTestUser("SYSTEM_ADMIN");
      extraUsers.push(target.id);
      await db.query(
        `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 day')`,
        [
          target.id,
          `demote-session-hash-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ],
      );

      const res = await demote(admin, target.id, { reason: "Left the team" });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ id: target.id, role: "CUSTOMER" });

      const sessions = await db.query(
        `SELECT 1 FROM user_sessions WHERE user_id = $1`,
        [target.id],
      );
      expect(sessions.rows).toHaveLength(0);

      const audit = await db.query(
        `SELECT admin_id, reason, snapshot FROM admin_audit_logs
          WHERE target_id = $1 AND action = 'DEMOTE_ADMIN'`,
        [target.id],
      );
      expect(audit.rows).toHaveLength(1);
      expect(audit.rows[0]).toMatchObject({
        admin_id: admin.id,
        reason: "Left the team",
      });
      expect(audit.rows[0].snapshot.role).toBe("SYSTEM_ADMIN");
      expect(audit.rows[0].snapshot).not.toHaveProperty("password_hash");

      // Their old admin token no longer works on admin routes.
      const stale = await request(app)
        .get("/api/admin/users")
        .set("Authorization", auth(target));
      expect(stale.status).toBe(403);
    });

    it("will not let an admin demote themselves", async () => {
      const res = await demote(admin, admin.id);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/another admin/i);
      const row = await db.query(`SELECT role FROM users WHERE id = $1`, [
        admin.id,
      ]);
      expect(row.rows[0].role).toBe("SYSTEM_ADMIN");
    });

    it("rejects non-admin targets, unknown ids, bad ids and short reasons", async () => {
      expect((await demote(admin, customer.id)).status).toBe(409);
      expect(
        (await demote(admin, "00000000-0000-4000-8000-000000000000")).status,
      ).toBe(404);
      expect((await demote(admin, "not-a-uuid")).status).toBe(404);
      expect(
        (await demote(admin, otherAdmin.id, { reason: "no" })).status,
      ).toBe(400);
      expect((await demote(admin, otherAdmin.id, {})).status).toBe(400);
    });

    it("is admin only", async () => {
      expect((await demote(customer, otherAdmin.id)).status).toBe(403);
      const role = await db.query(`SELECT role FROM users WHERE id = $1`, [
        otherAdmin.id,
      ]);
      expect(role.rows[0].role).toBe("SYSTEM_ADMIN");
    });
  });

  describe("DELETE /admin/users/:id (force delete)", () => {
    const remove = (who: TestUser, targetId: string, body: object = reason) =>
      request(app)
        .delete(`/api/admin/users/${targetId}`)
        .set("Authorization", auth(who))
        .send(body);

    it("deletes a user, keeps a snapshot without the password hash and cuts their token", async () => {
      const target = await createTestUser("CUSTOMER");
      extraUsers.push(target.id);
      const res = await remove(admin, target.id);
      expect(res.status).toBe(200);

      const gone = await db.query(`SELECT 1 FROM users WHERE id = $1`, [
        target.id,
      ]);
      expect(gone.rows).toHaveLength(0);

      const audit = await db.query(
        `SELECT snapshot FROM admin_audit_logs WHERE target_id = $1 AND action = 'DELETE_USER'`,
        [target.id],
      );
      expect(audit.rows[0].snapshot).toMatchObject({
        id: target.id,
        email: target.email,
      });
      expect(audit.rows[0].snapshot).not.toHaveProperty("password_hash");
      expect(redisClient.setEx).toHaveBeenCalledWith(
        `suspended:${target.id}`,
        3600,
        "true",
      );
    });

    it("refuses to delete yourself", async () => {
      const res = await remove(admin, admin.id);
      expect(res.status).toBe(409);
      const row = await db.query(`SELECT 1 FROM users WHERE id = $1`, [
        admin.id,
      ]);
      expect(row.rows).toHaveLength(1);
    });

    it("refuses to delete any SYSTEM_ADMIN, even a suspended one", async () => {
      const target = await createTestUser("SYSTEM_ADMIN", { suspended: true });
      extraUsers.push(target.id);
      const res = await remove(admin, target.id);
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/demote/i);
      const row = await db.query(`SELECT 1 FROM users WHERE id = $1`, [
        target.id,
      ]);
      expect(row.rows).toHaveLength(1);
    });

    it("hands household lists to the oldest member, or deletes lone lists", async () => {
      const target = await createTestUser("CUSTOMER");
      const heir = await createTestUser("CUSTOMER");
      extraUsers.push(target.id);
      const shared = await db.query(
        `INSERT INTO household_lists (name, invite_code) VALUES ('Shared', $1) RETURNING id`,
        [`S${Date.now()}`.slice(0, 10)],
      );
      const lone = await db.query(
        `INSERT INTO household_lists (name, invite_code) VALUES ('Lone', $1) RETURNING id`,
        [`L${Date.now()}`.slice(0, 10)],
      );
      await db.query(
        `INSERT INTO household_list_members (list_id, user_id, role) VALUES
           ($1, $2, 'OWNER'), ($1, $3, 'MEMBER'), ($4, $2, 'OWNER')`,
        [shared.rows[0].id, target.id, heir.id, lone.rows[0].id],
      );

      const res = await remove(admin, target.id);
      expect(res.status).toBe(200);

      const heirRole = await db.query(
        `SELECT role FROM household_list_members WHERE list_id = $1 AND user_id = $2`,
        [shared.rows[0].id, heir.id],
      );
      expect(heirRole.rows[0].role).toBe("OWNER");
      const loneList = await db.query(
        `SELECT 1 FROM household_lists WHERE id = $1`,
        [lone.rows[0].id],
      );
      expect(loneList.rows).toHaveLength(0);
      await db.query(`DELETE FROM household_lists WHERE id = $1`, [
        shared.rows[0].id,
      ]);
    });

    it("validates reason and id, and is admin only", async () => {
      expect((await remove(admin, customer.id, { reason: "x" })).status).toBe(
        400,
      );
      expect((await remove(admin, "nope")).status).toBe(404);
      expect(
        (await remove(admin, "00000000-0000-4000-8000-000000000000")).status,
      ).toBe(404);
      expect((await remove(customer, otherAdmin.id)).status).toBe(403);
    });
  });

  describe("GET /admin/metrics", () => {
    it("stops counting a store as active once its owner is suspended", async () => {
      const owner = await createTestUser("STORE_OWNER");
      await createTestStore(owner.id, "Metrics Store");
      const activeStores = async () =>
        (
          await request(app)
            .get("/api/admin/metrics")
            .set("Authorization", auth(admin))
        ).body.totalActiveStores as number;

      const before = await activeStores();
      await db.query(`UPDATE users SET is_suspended = true WHERE id = $1`, [
        owner.id,
      ]);
      expect(await activeStores()).toBe(before - 1);
    });
  });

  describe("admin routes use the live role", () => {
    it("locks out a suspended admin even with a valid token", async () => {
      const suspended = await createTestUser("SYSTEM_ADMIN", {
        suspended: true,
      });
      const res = await request(app)
        .get("/api/admin/metrics")
        .set("Authorization", auth(suspended));
      expect(res.status).toBe(403);
    });

    it("rejects a token for a user that no longer exists", async () => {
      const ghost = await createTestUser("SYSTEM_ADMIN");
      await db.query(`DELETE FROM users WHERE id = $1`, [ghost.id]);
      const res = await request(app)
        .get("/api/admin/metrics")
        .set("Authorization", auth(ghost));
      expect(res.status).toBe(401);
    });
  });

  describe("GET /admin/reviews", () => {
    it("names the reviewer and the target for moderation", async () => {
      const owner = await createTestUser("STORE_OWNER");
      const storeId = await createTestStore(owner.id, "Moderated Store");
      const inserted = await db.query(
        `INSERT INTO reviews (user_id, store_id, rating, comment)
         VALUES ($1, $2, 1, 'Awful') RETURNING id`,
        [customer.id, storeId],
      );
      const res = await request(app)
        .get("/api/admin/reviews?limit=100")
        .set("Authorization", auth(admin));
      const row = res.body.data.find(
        (r: { id: string }) => r.id === inserted.rows[0].id,
      );
      expect(row).toMatchObject({
        target_type: "STORE",
        target_name: "Moderated Store",
        reviewer_email: customer.email,
      });
      expect(row.reviewer_name).toBeTruthy();
    });
  });
});
