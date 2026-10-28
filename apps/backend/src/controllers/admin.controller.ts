import { db } from "@/config/database";
import redisClient from "@/config/redis";
import {
  clearLoginFailures,
  getLoginLockout,
  recordLoginFailure,
} from "@/features/auth/services/loginLockout.service";
import { releaseHouseholdLists } from "@/services/account.service";
import { auditSnapshot } from "@/utils/audit";
import { isUuid, sendValidationError } from "@/utils/http";
import { escapeLike } from "@/utils/like";
import {
  AdminDeleteSchema,
  AdminUserListQuerySchema,
  PaginationQuerySchema,
  PromoteAdminSchema,
  ToggleSuspensionSchema,
} from "@nearcommerce/api";
import bcrypt from "bcrypt";
import { Request, Response } from "express";
import { ZodError, ZodIssue, ZodType } from "zod";

const parseBody = <T>(
  schema: ZodType<T>,
  body: unknown,
): { data: T } | { error: ZodIssue[] } => {
  try {
    return { data: schema.parse(body) };
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues };
    throw error;
  }
};

const invalidateSuspensionCache = async (
  userId: string,
  suspended?: boolean,
) => {
  try {
    if (!redisClient.isOpen) return;
    if (suspended) await redisClient.setEx(`suspended:${userId}`, 3600, "true");
    else await redisClient.del(`suspended:${userId}`);
  } catch (error) {
    console.error("[ADMIN] Redis cache invalidation error:", error);
  }
};

// Root admins are the ones created from the server (pnpm add-admin / seed). An admin who was
// only promoted from the portal must not be able to demote, suspend or delete them.
const ROOT_ADMIN_PROTECTED = {
  error:
    "This admin was added by the platform owner and can only be changed by another owner-added admin.",
  code: "ROOT_ADMIN_PROTECTED",
};

type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: any[] }>;
};

async function isRootAdmin(
  client: Queryable,
  userId: string,
): Promise<boolean> {
  const { rows } = await client.query(
    "SELECT is_root_admin FROM users WHERE id = $1",
    [userId],
  );
  return rows[0]?.is_root_admin === true;
}

// True when `target` is a root admin and the acting admin is not one.
async function blocksRootAdmin(
  client: Queryable,
  actorId: string,
  target: { is_root_admin?: boolean },
): Promise<boolean> {
  if (target.is_root_admin !== true) return false;
  return !(await isRootAdmin(client, actorId));
}

type PaginationResult =
  | { page: number; limit: number }
  | { error: { path: (string | number)[]; message: string }[] };

const parsePagination = (query: Request["query"]): PaginationResult => {
  const parsed = PaginationQuerySchema.safeParse(query);
  if (!parsed.success) return { error: parsed.error.issues };

  const page = Number(parsed.data.page);
  const limit = Number(parsed.data.limit);
  if (page < 1 || limit < 1 || limit > 100)
    return {
      error: [
        {
          path: ["limit"],
          message:
            "page must be at least 1 and limit must be between 1 and 100",
        },
      ],
    };

  return { page, limit };
};

export async function listUsers(req: Request, res: Response) {
  const parsed = AdminUserListQuerySchema.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error.issues);
  const pagination = parsePagination(req.query);
  if ("error" in pagination) return sendValidationError(res, pagination.error);

  // Filters are optional and combine with AND.
  const where: string[] = [];
  const values: unknown[] = [];
  const { q, role, status } = parsed.data;
  if (q) {
    values.push(`%${escapeLike(q)}%`);
    where.push(
      `(email ILIKE $${values.length} ESCAPE '\\' OR full_name ILIKE $${values.length} ESCAPE '\\')`,
    );
  }
  if (role) {
    values.push(role);
    where.push(`role = $${values.length}`);
  }
  if (status) where.push(`is_suspended = ${status === "suspended"}`);
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const offset = (pagination.page - 1) * pagination.limit;
  const result = await db.query(
    `SELECT id, email, full_name, role, is_suspended, is_root_admin, email_verified_at, created_at, updated_at
     FROM users ${clause}
     ORDER BY created_at DESC, id
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, pagination.limit, offset],
  );
  const count = await db.query(
    `SELECT COUNT(*)::int AS count FROM users ${clause}`,
    values,
  );
  return res.json({
    data: result.rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: count.rows[0].count,
    },
  });
}

// Everything an admin needs to review one account: profile, stores owned, review and
// shared-list activity.
export async function getUserDetails(req: Request, res: Response) {
  const { userId } = req.params;
  if (!isUuid(userId)) return res.status(404).json({ error: "User not found" });

  const user = await db.query(
    `SELECT id, email, full_name, role, is_suspended, is_root_admin, email_verified_at, created_at, updated_at
       FROM users WHERE id = $1`,
    [userId],
  );
  if (user.rows.length === 0)
    return res.status(404).json({ error: "User not found" });

  const [stores, reviews, lists] = await Promise.all([
    db.query(
      `SELECT id, name, is_suspended FROM stores
        WHERE owner_id = $1 ORDER BY created_at, id`,
      [userId],
    ),
    db.query("SELECT COUNT(*)::int AS count FROM reviews WHERE user_id = $1", [
      userId,
    ]),
    db.query(
      "SELECT COUNT(*)::int AS count FROM household_list_members WHERE user_id = $1",
      [userId],
    ),
  ]);

  return res.json({
    data: {
      ...user.rows[0],
      stores: stores.rows,
      review_count: reviews.rows[0].count,
      list_count: lists.rows[0].count,
    },
  });
}

export async function listStores(req: Request, res: Response) {
  const pagination = parsePagination(req.query);
  if ("error" in pagination) return sendValidationError(res, pagination.error);

  const offset = (pagination.page - 1) * pagination.limit;
  const result = await db.query(
    `SELECT s.*, u.email AS owner_email, u.full_name AS owner_name
       FROM stores s
       JOIN users u ON u.id = s.owner_id
      ORDER BY s.created_at DESC, s.id LIMIT $1 OFFSET $2`,
    [pagination.limit, offset],
  );
  const count = await db.query("SELECT COUNT(*)::int AS count FROM stores");
  return res.json({
    data: result.rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: count.rows[0].count,
    },
  });
}

const ACTIVITY_DAYS = 14;

export async function getGlobalMetrics(_req: Request, res: Response) {
  const [
    stores,
    registrations,
    flaggedItems,
    suspendedUsers,
    totals,
    roles,
    catalog,
    activity,
  ] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS count FROM stores s
           JOIN users u ON u.id = s.owner_id
          WHERE s.is_suspended = false AND u.is_suspended = false`,
    ),
    db.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'",
    ),
    db.query(
      "SELECT COUNT(*)::int AS count FROM products WHERE last_verified_at < CURRENT_TIMESTAMP - INTERVAL '30 days'",
    ),
    db.query(
      "SELECT COUNT(*)::int AS count FROM users WHERE is_suspended = true",
    ),
    db.query(
      `SELECT (SELECT COUNT(*)::int FROM users) AS users,
              (SELECT COUNT(*)::int FROM stores) AS stores,
              (SELECT COUNT(*)::int FROM products) AS products,
              (SELECT COUNT(*)::int FROM reviews) AS reviews`,
    ),
    db.query("SELECT role, COUNT(*)::int AS count FROM users GROUP BY role"),
    db.query(
      `SELECT COUNT(*) FILTER (WHERE is_published)::int AS published,
              COUNT(*) FILTER (WHERE NOT is_published)::int AS drafts,
              COUNT(*) FILTER (WHERE quantity = 0)::int AS out_of_stock
         FROM products`,
    ),
    db.query(
      `WITH days AS (
         SELECT generate_series(
                  (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
                  CURRENT_DATE, INTERVAL '1 day')::date AS day)
       SELECT d.day::text AS date,
              (SELECT COUNT(*)::int FROM users    x WHERE x.created_at::date = d.day) AS users,
              (SELECT COUNT(*)::int FROM stores   x WHERE x.created_at::date = d.day) AS stores,
              (SELECT COUNT(*)::int FROM reviews  x WHERE x.created_at::date = d.day) AS reviews
         FROM days d ORDER BY d.day`,
      [ACTIVITY_DAYS],
    ),
  ]);

  const usersByRole = { CUSTOMER: 0, STORE_OWNER: 0, SYSTEM_ADMIN: 0 };
  for (const row of roles.rows)
    usersByRole[row.role as keyof typeof usersByRole] = row.count;

  return res.json({
    totalActiveStores: stores.rows[0].count,
    newRegistrations: registrations.rows[0].count,
    flaggedItems: flaggedItems.rows[0].count,
    suspendedUsers: suspendedUsers.rows[0].count,
    totals: totals.rows[0],
    usersByRole,
    catalog: {
      published: catalog.rows[0].published,
      drafts: catalog.rows[0].drafts,
      outOfStock: catalog.rows[0].out_of_stock,
      stale: flaggedItems.rows[0].count,
    },
    activity: activity.rows,
  });
}

export async function listAuditLogs(req: Request, res: Response) {
  const pagination = parsePagination(req.query);
  if ("error" in pagination) return sendValidationError(res, pagination.error);

  const offset = (pagination.page - 1) * pagination.limit;
  const result = await db.query(
    `SELECT l.id, l.admin_id, a.email AS admin_email, l.action, l.target_id,
            l.target_type, l.reason, l.snapshot, l.created_at
       FROM admin_audit_logs l
       LEFT JOIN users a ON a.id = l.admin_id
      ORDER BY l.created_at DESC, l.id LIMIT $1 OFFSET $2`,
    [pagination.limit, offset],
  );
  const count = await db.query(
    "SELECT COUNT(*)::int AS count FROM admin_audit_logs",
  );
  return res.json({
    data: result.rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: count.rows[0].count,
    },
  });
}

export async function listReviews(req: Request, res: Response) {
  const pagination = parsePagination(req.query);
  if ("error" in pagination) return sendValidationError(res, pagination.error);
  const offset = (pagination.page - 1) * pagination.limit;
  const result = await db.query(
    `SELECT r.id, r.user_id, r.store_id, r.product_id, r.rating, r.comment,
            r.created_at, r.updated_at,
            u.full_name AS reviewer_name, u.email AS reviewer_email,
            CASE WHEN r.store_id IS NOT NULL THEN 'STORE' ELSE 'PRODUCT' END
              AS target_type,
            COALESCE(s.name, p.name) AS target_name
     FROM reviews r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN stores s ON s.id = r.store_id
     LEFT JOIN products p ON p.id = r.product_id
     ORDER BY r.created_at DESC, r.id LIMIT $1 OFFSET $2`,
    [pagination.limit, offset],
  );
  const count = await db.query("SELECT COUNT(*)::int AS count FROM reviews");
  return res.json({
    data: result.rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: count.rows[0].count,
    },
  });
}

export async function deleteReview(req: Request, res: Response) {
  const parsed = parseBody(AdminDeleteSchema, req.body);
  if ("error" in parsed) return sendValidationError(res, parsed.error);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const review = await client.query(
      "SELECT * FROM reviews WHERE id = $1 FOR UPDATE",
      [req.params.reviewId],
    );
    if (!review.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Review not found." });
    }
    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, target_type, reason, snapshot)
       VALUES ($1, 'DELETE_REVIEW', $2, 'REVIEW', $3, $4)`,
      [
        req.user!.id,
        req.params.reviewId,
        parsed.data.reason,
        JSON.stringify(review.rows[0]),
      ],
    );
    await client.query("DELETE FROM reviews WHERE id = $1", [
      req.params.reviewId,
    ]);
    await client.query("COMMIT");
    return res.json({ message: "Review deleted and audited successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
}

export async function toggleUserSuspension(req: Request, res: Response) {
  const parsed = parseBody(ToggleSuspensionSchema, req.body);
  if ("error" in parsed) return sendValidationError(res, parsed.error);
  const { is_suspended, reason } = parsed.data;
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT id, is_root_admin FROM users WHERE id = $1 FOR UPDATE",
      [req.params.userId],
    );
    if (
      existing.rows.length &&
      (await blocksRootAdmin(client, req.user!.id, existing.rows[0]))
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json(ROOT_ADMIN_PROTECTED);
    }
    const result = await client.query(
      `UPDATE users SET is_suspended = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING id, email, full_name, role, is_suspended, is_root_admin, created_at, updated_at`,
      [is_suspended, req.params.userId],
    );
    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, target_type, reason)
       VALUES ($1, $2, $3, 'USER', $4)`,
      [
        req.user!.id,
        is_suspended ? "SUSPEND_USER" : "UNSUSPEND_USER",
        req.params.userId,
        reason,
      ],
    );
    await client.query("COMMIT");

    await invalidateSuspensionCache(req.params.userId, is_suspended);
    return res.json({ data: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
}

export async function toggleStoreSuspension(req: Request, res: Response) {
  const parsed = parseBody(ToggleSuspensionSchema, req.body);
  if ("error" in parsed) return sendValidationError(res, parsed.error);
  const { is_suspended, reason } = parsed.data;
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE stores SET is_suspended = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING id, owner_id, is_suspended`,
      [is_suspended, req.params.storeId],
    );
    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Store not found." });
    }

    const store = result.rows[0];
    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, target_type, reason)
       VALUES ($1, $2, $3, 'STORE', $4)`,
      [
        req.user!.id,
        is_suspended ? "SUSPEND_STORE" : "UNSUSPEND_STORE",
        req.params.storeId,
        reason,
      ],
    );
    await client.query("COMMIT");
    await invalidateSuspensionCache(store.owner_id);
    return res.json({ data: store });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
}

async function deleteTarget(
  req: Request,
  res: Response,
  table: "users" | "stores",
  targetType: "USER" | "STORE",
  action: "DELETE_USER" | "DELETE_STORE",
) {
  const parsed = parseBody(AdminDeleteSchema, req.body);
  if ("error" in parsed) return sendValidationError(res, parsed.error);
  const id = table === "users" ? req.params.userId : req.params.storeId;
  if (!isUuid(id))
    return res.status(404).json({ error: `${targetType} not found.` });
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const target = await client.query(
      `SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!target.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: `${targetType} not found.` });
    }

    if (table === "users") {
      // SRS 1.3.3: nobody deletes themselves here, and an admin must be
      // demoted by another admin before the account can be removed.
      if (id === req.user!.id) {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({ error: "You cannot delete your own account here." });
      }
      if (await blocksRootAdmin(client, req.user!.id, target.rows[0])) {
        await client.query("ROLLBACK");
        return res.status(403).json(ROOT_ADMIN_PROTECTED);
      }
      if (target.rows[0].role === "SYSTEM_ADMIN") {
        await client.query("ROLLBACK");
        return res
          .status(409)
          .json({ error: "Demote the SYSTEM_ADMIN before deletion." });
      }
      await releaseHouseholdLists(client, id);
    }

    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, target_type, reason, snapshot)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user!.id,
        action,
        id,
        targetType,
        parsed.data.reason,
        JSON.stringify(auditSnapshot(target.rows[0])),
      ],
    );
    await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    await client.query("COMMIT");

    // A deleted user's access token must stop working straight away.
    if (table === "users") await invalidateSuspensionCache(id, true);
    else await invalidateSuspensionCache(target.rows[0].owner_id);
    return res.json({
      message: `${targetType} deleted and audited successfully.`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[ADMIN] deleteTarget error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
}

export const deleteUser = (req: Request, res: Response) =>
  deleteTarget(req, res, "users", "USER", "DELETE_USER");

export const deleteStore = (req: Request, res: Response) =>
  deleteTarget(req, res, "stores", "STORE", "DELETE_STORE");

// PATCH /admin/users/:userId/demote
// Turns a SYSTEM_ADMIN into a CUSTOMER. Another admin has to do it (SRS 1.3.3).
export async function demoteAdmin(req: Request, res: Response) {
  const parsed = parseBody(AdminDeleteSchema, req.body);
  if ("error" in parsed) return sendValidationError(res, parsed.error);
  const userId = req.params.userId;
  if (!isUuid(userId))
    return res.status(404).json({ error: "User not found." });
  if (userId === req.user!.id)
    return res.status(409).json({ error: "Another admin must demote you." });

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const target = await client.query(
      "SELECT * FROM users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    if (!target.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }
    if (target.rows[0].role !== "SYSTEM_ADMIN") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "User is not a SYSTEM_ADMIN." });
    }
    if (await blocksRootAdmin(client, req.user!.id, target.rows[0])) {
      await client.query("ROLLBACK");
      return res.status(403).json(ROOT_ADMIN_PROTECTED);
    }

    const updated = await client.query(
      `UPDATE users SET role = 'CUSTOMER', is_root_admin = false,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, email, full_name, role, is_suspended, is_root_admin, created_at, updated_at`,
      [userId],
    );
    // Sign them out everywhere; their access token stops working on admin
    // routes immediately because those re-check the role.
    await client.query("DELETE FROM user_sessions WHERE user_id = $1", [
      userId,
    ]);
    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, target_type, reason, snapshot)
       VALUES ($1, 'DEMOTE_ADMIN', $2, 'USER', $3, $4)`,
      [
        req.user!.id,
        userId,
        parsed.data.reason,
        JSON.stringify(auditSnapshot(target.rows[0])),
      ],
    );
    await client.query("COMMIT");
    return res.json({ data: updated.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[ADMIN] demoteAdmin error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
}

// PATCH /admin/users/:userId/promote
// Makes an existing account a SYSTEM_ADMIN. The acting admin has to type their own password.
// Admins made this way are not root admins: they cannot touch the ones added from the server.
export async function promoteToAdmin(req: Request, res: Response) {
  const parsed = parseBody(PromoteAdminSchema, req.body);
  if ("error" in parsed) return sendValidationError(res, parsed.error);
  const userId = req.params.userId;
  if (!isUuid(userId))
    return res.status(404).json({ error: "User not found." });
  if (userId === req.user!.id)
    return res.status(409).json({ error: "You are already an admin." });

  const ip = req.ip ?? "unknown";
  try {
    const actor = await db.query(
      "SELECT email, password_hash FROM users WHERE id = $1",
      [req.user!.id],
    );
    if (!actor.rows.length)
      return res.status(401).json({ error: "Invalid token" });

    // Same progressive lockout as the login form, so a hijacked session cannot guess passwords.
    const lockedFor = await getLoginLockout(actor.rows[0].email, ip);
    if (lockedFor > 0) {
      res.setHeader("Retry-After", String(lockedFor));
      return res.status(429).json({
        error: `Too many failed attempts. Try again in ${lockedFor} seconds.`,
      });
    }
    const passwordOk = await bcrypt.compare(
      parsed.data.password,
      actor.rows[0].password_hash,
    );
    if (!passwordOk) {
      await recordLoginFailure(actor.rows[0].email, ip);
      return res
        .status(403)
        .json({ error: "Incorrect password.", code: "INVALID_PASSWORD" });
    }
    await clearLoginFailures(actor.rows[0].email, ip);
  } catch (error) {
    console.error("[ADMIN] promoteToAdmin password check error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const target = await client.query(
      "SELECT * FROM users WHERE id = $1 FOR UPDATE",
      [userId],
    );
    if (!target.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found." });
    }
    if (target.rows[0].role === "SYSTEM_ADMIN") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "User is already a SYSTEM_ADMIN." });
    }
    if (target.rows[0].is_suspended) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "Unsuspend this user before making them an admin." });
    }

    const updated = await client.query(
      `UPDATE users SET role = 'SYSTEM_ADMIN', is_root_admin = false,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, email, full_name, role, is_suspended, is_root_admin, created_at, updated_at`,
      [userId],
    );
    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, target_type, reason, snapshot)
       VALUES ($1, 'PROMOTE_ADMIN', $2, 'USER', $3, $4)`,
      [
        req.user!.id,
        userId,
        parsed.data.reason ?? null,
        JSON.stringify(auditSnapshot(target.rows[0])),
      ],
    );
    await client.query("COMMIT");
    return res.json({ data: updated.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[ADMIN] promoteToAdmin error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
}
