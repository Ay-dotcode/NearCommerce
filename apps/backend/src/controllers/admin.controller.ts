import { db } from "@/config/database";
import redisClient from "@/config/redis";
import {
  AdminDeleteSchema,
  PaginationQuerySchema,
  ToggleSuspensionSchema,
} from "@nearcommerce/api";
import { Request, Response } from "express";
import { ZodError, ZodType } from "zod";

const parseBody = <T>(schema: ZodType<T>, body: unknown) => {
  try {
    return { data: schema.parse(body) };
  } catch (error) {
    if (error instanceof ZodError) return { error: error.issues };
    throw error;
  }
};

const sendValidationError = (res: Response, issues: unknown) =>
  res.status(400).json({ error: "Validation failed", details: issues });

const invalidateSuspensionCache = async (
  userId: string,
  suspended?: boolean,
) => {
  try {
    if (suspended) await redisClient.setEx(`suspended:${userId}`, 3600, "true");
    else await redisClient.del(`suspended:${userId}`);
  } catch (error) {
    console.error("[ADMIN] Redis cache invalidation error:", error);
  }
};

const parsePagination = (query: Request["query"]) => {
  const parsed = PaginationQuerySchema.safeParse(query);
  if (!parsed.success) return { error: parsed.error.issues };

  const page = Number(parsed.data.page);
  const limit = Number(parsed.data.limit);
  if (page < 1 || limit < 1 || limit > 100)
    return {
      error: "page must be at least 1 and limit must be between 1 and 100",
    };

  return { page, limit };
};

export async function listUsers(req: Request, res: Response) {
  const pagination = parsePagination(req.query);
  if ("error" in pagination) return sendValidationError(res, pagination.error);

  const offset = (pagination.page - 1) * pagination.limit;
  const result = await db.query(
    `SELECT id, email, full_name, role, is_suspended, email_verified_at, created_at, updated_at
     FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [pagination.limit, offset],
  );
  const count = await db.query("SELECT COUNT(*)::int AS count FROM users");
  return res.json({
    data: result.rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: count.rows[0].count,
    },
  });
}

export async function listStores(req: Request, res: Response) {
  const pagination = parsePagination(req.query);
  if ("error" in pagination) return sendValidationError(res, pagination.error);

  const offset = (pagination.page - 1) * pagination.limit;
  const result = await db.query(
    `SELECT * FROM stores ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
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

export async function getGlobalMetrics(_req: Request, res: Response) {
  const [stores, registrations, flaggedItems, suspendedUsers] = await Promise.all([
    db.query("SELECT COUNT(*)::int AS count FROM stores WHERE is_suspended = false"),
    db.query("SELECT COUNT(*)::int AS count FROM users WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'"),
    db.query("SELECT COUNT(*)::int AS count FROM products WHERE last_verified_at < CURRENT_TIMESTAMP - INTERVAL '30 days'"),
    db.query("SELECT COUNT(*)::int AS count FROM users WHERE is_suspended = true"),
  ]);

  return res.json({
    totalActiveStores: stores.rows[0].count,
    newRegistrations: registrations.rows[0].count,
    flaggedItems: flaggedItems.rows[0].count,
    suspendedUsers: suspendedUsers.rows[0].count,
  });
}

export async function listAuditLogs(req: Request, res: Response) {
  const pagination = parsePagination(req.query);
  if ("error" in pagination) return sendValidationError(res, pagination.error);

  const offset = (pagination.page - 1) * pagination.limit;
  const result = await db.query(
    `SELECT id, admin_id, action, target_id, target_type, reason, snapshot, created_at
     FROM admin_audit_logs ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [pagination.limit, offset],
  );
  const count = await db.query("SELECT COUNT(*)::int AS count FROM admin_audit_logs");
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
    `SELECT id, user_id, store_id, product_id, rating, comment, created_at
     FROM reviews ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [pagination.limit, offset],
  );
  const count = await db.query("SELECT COUNT(*)::int AS count FROM reviews");
  return res.json({ data: result.rows, pagination: { page: pagination.page, limit: pagination.limit, total: count.rows[0].count } });
}

export async function deleteReview(req: Request, res: Response) {
  const parsed = parseBody(AdminDeleteSchema, req.body);
  if ("error" in parsed) return sendValidationError(res, parsed.error);
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const review = await client.query("SELECT * FROM reviews WHERE id = $1 FOR UPDATE", [req.params.reviewId]);
    if (!review.rows.length) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Review not found." }); }
    await client.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_id, target_type, reason, snapshot)
       VALUES ($1, 'DELETE_REVIEW', $2, 'REVIEW', $3, $4)`,
      [req.user!.id, req.params.reviewId, parsed.data.reason, JSON.stringify(review.rows[0])],
    );
    await client.query("DELETE FROM reviews WHERE id = $1", [req.params.reviewId]);
    await client.query("COMMIT");
    return res.json({ message: "Review deleted and audited successfully." });
  } catch (error) { await client.query("ROLLBACK"); return res.status(500).json({ error: "Internal Server Error" }); }
  finally { client.release(); }
}

export async function toggleUserSuspension(req: Request, res: Response) {
  const parsed = parseBody(ToggleSuspensionSchema, req.body);
  if ("error" in parsed) return sendValidationError(res, parsed.error);
  const { is_suspended, reason } = parsed.data;
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE users SET is_suspended = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 RETURNING id, email, full_name, role, is_suspended, created_at, updated_at`,
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

    if (
      table === "users" &&
      id !== req.user!.id &&
      target.rows[0].role === "SYSTEM_ADMIN" &&
      !target.rows[0].is_suspended
    ) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "Demote the active SYSTEM_ADMIN before deletion." });
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
        JSON.stringify(target.rows[0]),
      ],
    );
    await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    await client.query("COMMIT");

    if (table === "users") await invalidateSuspensionCache(id);
    else await invalidateSuspensionCache(target.rows[0].owner_id);
    return res.json({
      message: `${targetType} deleted and audited successfully.`,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Internal Server Error" });
  } finally {
    client.release();
  }
}

export const deleteUser = (req: Request, res: Response) =>
  deleteTarget(req, res, "users", "USER", "DELETE_USER");

export const deleteStore = (req: Request, res: Response) =>
  deleteTarget(req, res, "stores", "STORE", "DELETE_STORE");
