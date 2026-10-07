import { db } from "@/config/database";
import redisClient from "@/config/redis";
import {
  JWT_ACCESS_EXPIRY,
  JWT_ACCESS_EXPIRY_SECONDS,
  JWT_ACCESS_SECRET,
  REFRESH_TOKEN_BYTES,
  USER_SESSION_TTL_MS,
} from "@/constants";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;

export class SessionError extends Error {
  constructor(
    public status: 401 | 403,
    message: string,
  ) {
    super(message);
  }
}

export const hashRefreshToken = (raw: string) =>
  crypto.createHash("sha256").update(raw).digest("hex");

export interface SessionUser {
  id: string;
  role: string;
  store_id?: string;
}

export interface IssuedSession {
  access_token: string;
  refresh_token: string;
  user: SessionUser;
}

// Creates a session row and returns a fresh access + refresh token pair.
export async function issueSession(
  user: { id: string; role: string },
  client: Queryable = db,
): Promise<IssuedSession> {
  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    JWT_ACCESS_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRY },
  );
  const refreshToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("hex");

  await client.query(
    `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at) VALUES ($1, $2, $3)`,
    [
      user.id,
      hashRefreshToken(refreshToken),
      new Date(Date.now() + USER_SESSION_TTL_MS),
    ],
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: { id: user.id, role: user.role },
  };
}

export async function ownerStoreId(
  userId: string,
  client: Queryable = db,
): Promise<string | undefined> {
  const res = await client.query(
    `SELECT id FROM stores WHERE owner_id = $1 ORDER BY created_at, id LIMIT 1`,
    [userId],
  );
  return res.rows[0]?.id;
}

// Keeps the real-time suspension check (auth middleware) in step with a new access token.
export async function primeSuspensionCache(userId: string) {
  try {
    if (redisClient.isOpen)
      await redisClient.set(`suspended:${userId}`, "false", {
        EX: JWT_ACCESS_EXPIRY_SECONDS,
      });
  } catch (error) {
    console.error("[AUTH] Failed to prime redis suspension cache:", error);
  }
}

/**
 * Exchanges a refresh token for a new pair and retires the old one.
 *
 * The old session is deleted with a single `DELETE ... RETURNING`, so two
 * concurrent requests with the same token cannot both succeed: replaying a used
 * token always fails with 401. Suspended users are refused and their session
 * stays deleted.
 */
export async function rotateSession(rawRefreshToken: string) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const consumed = await client.query(
      `DELETE FROM user_sessions
        WHERE refresh_token_hash = $1 AND expires_at > NOW()
        RETURNING user_id`,
      [hashRefreshToken(rawRefreshToken)],
    );
    if (!consumed.rows.length) {
      await client.query("COMMIT");
      throw new SessionError(401, "Invalid or expired refresh token");
    }

    const userRes = await client.query(
      `SELECT id, role, is_suspended FROM users WHERE id = $1`,
      [consumed.rows[0].user_id],
    );
    const user = userRes.rows[0];
    if (!user) {
      await client.query("COMMIT");
      throw new SessionError(401, "Invalid or expired refresh token");
    }
    if (user.is_suspended) {
      await client.query("COMMIT");
      throw new SessionError(403, "Account is suspended.");
    }

    const session = await issueSession(user, client);
    const storeId =
      user.role === "STORE_OWNER"
        ? await ownerStoreId(user.id, client)
        : undefined;
    await client.query("COMMIT");

    await primeSuspensionCache(user.id);
    return {
      ...session,
      user: { ...session.user, ...(storeId ? { store_id: storeId } : {}) },
    };
  } catch (error) {
    if (!(error instanceof SessionError))
      await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

// Idempotent: unknown or already-revoked tokens are not an error.
export async function revokeSession(rawRefreshToken: string) {
  await db.query(`DELETE FROM user_sessions WHERE refresh_token_hash = $1`, [
    hashRefreshToken(rawRefreshToken),
  ]);
}
