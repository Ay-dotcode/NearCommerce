import { app } from "@/app";
import { db } from "@/config/database";
import {
  getLoginLockout,
  recordLoginFailure,
} from "@/features/auth/services/loginLockout.service";
import { generateMockToken } from "@/utils/testAuth";
import bcrypt from "bcrypt";
import request from "supertest";

jest.mock("@/config/redis", () => ({
  __esModule: true,
  default: { del: jest.fn(), get: jest.fn(), setEx: jest.fn(), isOpen: true },
  connectRedis: jest.fn(),
}));
jest.mock("@/features/auth/services/loginLockout.service", () => ({
  getLoginLockout: jest.fn().mockResolvedValue(0),
  recordLoginFailure: jest.fn().mockResolvedValue(undefined),
  clearLoginFailures: jest.fn().mockResolvedValue(undefined),
}));

jest.setTimeout(30000);

const RUN = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
const PASSWORD = "AdminPass123!";
const reason = { reason: "Needs moderation rights" };

interface Acct {
  id: string;
  token: string;
}
const created: string[] = [];

async function makeUser(
  label: string,
  role: "CUSTOMER" | "STORE_OWNER" | "SYSTEM_ADMIN",
  opts: { root?: boolean; suspended?: boolean } = {},
): Promise<Acct> {
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role, email_verified_at, is_root_admin, is_suspended)
     VALUES ($1, $2, $3, $4, NOW(), $5, $6) RETURNING id, email, role`,
    [
      `${label}_${RUN}@promote.test`,
      await bcrypt.hash(PASSWORD, 4),
      `Person ${label}`,
      role,
      opts.root ?? false,
      opts.suspended ?? false,
    ],
  );
  created.push(rows[0].id);
  return { id: rows[0].id, token: generateMockToken(rows[0]) };
}

const as = (a: Acct) => ({ Authorization: `Bearer ${a.token}` });
const roleOf = async (id: string) =>
  (await db.query("SELECT role, is_root_admin FROM users WHERE id = $1", [id]))
    .rows[0];

describe("Admins making other admins, and protection of root admins", () => {
  let root: Acct; // added from the server (owner)
  let promoted: Acct; // promoted from the portal, not root
  let customer: Acct;

  beforeAll(async () => {
    root = await makeUser("root", "SYSTEM_ADMIN", { root: true });
    promoted = await makeUser("promoted", "SYSTEM_ADMIN");
    customer = await makeUser("customer", "CUSTOMER");
  });

  beforeEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await db.query("DELETE FROM admin_audit_logs WHERE admin_id = ANY($1)", [
      created,
    ]);
    await db.query("DELETE FROM users WHERE id = ANY($1)", [created]);
    await db.end();
  });

  const promote = (who: Acct, targetId: string, body: object) =>
    request(app)
      .patch(`/api/admin/users/${targetId}/promote`)
      .set(as(who))
      .send(body);

  describe("PATCH /admin/users/:id/promote", () => {
    it("makes a customer an admin when the admin's own password is right, and audits it", async () => {
      const target = await makeUser("t1", "CUSTOMER");
      const res = await promote(root, target.id, {
        password: PASSWORD,
        ...reason,
      });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        id: target.id,
        role: "SYSTEM_ADMIN",
        is_root_admin: false,
      });
      expect(res.body.data).not.toHaveProperty("password_hash");
      expect((await roleOf(target.id)).role).toBe("SYSTEM_ADMIN");

      const log = await db.query(
        `SELECT action, reason, snapshot FROM admin_audit_logs
          WHERE target_id = $1 AND action = 'PROMOTE_ADMIN'`,
        [target.id],
      );
      expect(log.rows).toHaveLength(1);
      expect(log.rows[0].reason).toBe(reason.reason);
      expect(log.rows[0].snapshot).not.toHaveProperty("password_hash");
    });

    it("also works for store owners, and an admin who was only promoted can promote too", async () => {
      const owner = await makeUser("t2", "STORE_OWNER");
      const res = await promote(promoted, owner.id, { password: PASSWORD });
      expect(res.status).toBe(200);
      expect((await roleOf(owner.id)).role).toBe("SYSTEM_ADMIN");
    });

    it("rejects a wrong password, changes nothing and counts the failure", async () => {
      const target = await makeUser("t3", "CUSTOMER");
      const res = await promote(root, target.id, { password: "wrong-pass" });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("INVALID_PASSWORD");
      expect((await roleOf(target.id)).role).toBe("CUSTOMER");
      expect(recordLoginFailure).toHaveBeenCalledTimes(1);
    });

    it("needs a password at all", async () => {
      const target = await makeUser("t4", "CUSTOMER");
      expect((await promote(root, target.id, {})).status).toBe(400);
      expect((await promote(root, target.id, { password: "" })).status).toBe(
        400,
      );
      expect((await roleOf(target.id)).role).toBe("CUSTOMER");
    });

    it("is locked out after too many wrong passwords", async () => {
      (getLoginLockout as jest.Mock).mockResolvedValueOnce(120);
      const target = await makeUser("t5", "CUSTOMER");
      const res = await promote(root, target.id, { password: PASSWORD });
      expect(res.status).toBe(429);
      expect(res.headers["retry-after"]).toBe("120");
      expect((await roleOf(target.id)).role).toBe("CUSTOMER");
    });

    it("does not let non-admins promote anyone", async () => {
      const target = await makeUser("t6", "CUSTOMER");
      const res = await promote(customer, target.id, { password: PASSWORD });
      expect(res.status).toBe(403);
      expect((await roleOf(target.id)).role).toBe("CUSTOMER");
    });

    it("refuses already-admins, yourself, suspended users and unknown ids", async () => {
      expect(
        (await promote(root, promoted.id, { password: PASSWORD })).status,
      ).toBe(409);
      expect(
        (await promote(root, root.id, { password: PASSWORD })).status,
      ).toBe(409);

      const suspended = await makeUser("t7", "CUSTOMER", { suspended: true });
      expect(
        (await promote(root, suspended.id, { password: PASSWORD })).status,
      ).toBe(409);
      expect((await roleOf(suspended.id)).role).toBe("CUSTOMER");

      expect(
        (
          await promote(root, "00000000-0000-4000-8000-000000000000", {
            password: PASSWORD,
          })
        ).status,
      ).toBe(404);
      expect(
        (await promote(root, "not-a-uuid", { password: PASSWORD })).status,
      ).toBe(404);
    });

    it("the new admin can use admin routes", async () => {
      const target = await makeUser("t8", "CUSTOMER");
      await promote(root, target.id, { password: PASSWORD });
      const fresh = {
        id: target.id,
        token: generateMockToken({ id: target.id, role: "SYSTEM_ADMIN" }),
      };
      expect(
        (await request(app).get("/api/admin/users").set(as(fresh))).status,
      ).toBe(200);
    });
  });

  describe("a promoted admin cannot remove a root admin", () => {
    it("cannot demote one", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${root.id}/demote`)
        .set(as(promoted))
        .send(reason);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("ROOT_ADMIN_PROTECTED");
      expect(await roleOf(root.id)).toMatchObject({
        role: "SYSTEM_ADMIN",
        is_root_admin: true,
      });
    });

    it("cannot suspend one", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${root.id}/suspend`)
        .set(as(promoted))
        .send({ is_suspended: true, ...reason });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("ROOT_ADMIN_PROTECTED");
      const row = await db.query(
        "SELECT is_suspended FROM users WHERE id = $1",
        [root.id],
      );
      expect(row.rows[0].is_suspended).toBe(false);
    });

    it("cannot delete one", async () => {
      const res = await request(app)
        .delete(`/api/admin/users/${root.id}`)
        .set(as(promoted))
        .send(reason);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("ROOT_ADMIN_PROTECTED");
      expect(
        (await db.query("SELECT 1 FROM users WHERE id = $1", [root.id])).rows,
      ).toHaveLength(1);
    });

    it("cannot get around it by promoting, since a promoted admin is never root", async () => {
      const other = await makeUser("t9", "CUSTOMER");
      await promote(promoted, other.id, { password: PASSWORD });
      expect((await roleOf(other.id)).is_root_admin).toBe(false);
    });
  });

  describe("admins who were not added by the owner stay manageable", () => {
    it("a root admin can demote a promoted admin, and the flag is cleared", async () => {
      const target = await makeUser("t10", "CUSTOMER");
      await promote(root, target.id, { password: PASSWORD });
      const res = await request(app)
        .patch(`/api/admin/users/${target.id}/demote`)
        .set(as(root))
        .send(reason);
      expect(res.status).toBe(200);
      expect(await roleOf(target.id)).toMatchObject({
        role: "CUSTOMER",
        is_root_admin: false,
      });
    });

    it("an admin can still suspend a promoted admin, and a root admin can manage another root admin", async () => {
      const target = await makeUser("t11", "SYSTEM_ADMIN");
      const suspend = await request(app)
        .patch(`/api/admin/users/${target.id}/suspend`)
        .set(as(root))
        .send({ is_suspended: true, ...reason });
      expect(suspend.status).toBe(200);

      const otherRoot = await makeUser("root2", "SYSTEM_ADMIN", {
        root: true,
      });
      const res = await request(app)
        .patch(`/api/admin/users/${otherRoot.id}/demote`)
        .set(as(root))
        .send(reason);
      expect(res.status).toBe(200);
    });

    it("lists whether an admin is a root admin", async () => {
      const res = await request(app).get("/api/admin/users").set(as(root));
      const row = res.body.data.find((u: any) => u.id === root.id);
      expect(row.is_root_admin).toBe(true);
    });
  });
});
