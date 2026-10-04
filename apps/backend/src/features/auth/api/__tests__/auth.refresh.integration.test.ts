import { app } from "@/app";
import { db } from "@/config/database";
import { hashRefreshToken } from "@/features/auth/services/session.service";
import { refreshLimiter } from "@/middleware/rateLimiter";
import bcrypt from "bcrypt";
import request from "supertest";

const PASSWORD = "securepassword123";
const email = `refresh_${Date.now()}@sessions.test`;
let userId: string;

async function login() {
  const res = await request(app)
    .post("/auth/login")
    .send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return res.body as {
    access_token: string;
    refresh_token: string;
    user: { id: string; role: string; store_id?: string };
  };
}

beforeAll(async () => {
  const hash = await bcrypt.hash(PASSWORD, 4);
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
     VALUES ($1, $2, 'Refresh User', 'STORE_OWNER', NOW()) RETURNING id`,
    [email, hash],
  );
  userId = rows[0].id;
});

beforeEach(async () => {
  await db.query(`DELETE FROM user_sessions WHERE user_id = $1`, [userId]);
  await db.query(`UPDATE users SET is_suspended = false WHERE id = $1`, [
    userId,
  ]);
  for (const ip of ["127.0.0.1", "::ffff:127.0.0.1", "::1"])
    refreshLimiter.resetKey(ip);
});

afterAll(async () => {
  await db.query(`DELETE FROM users WHERE id = $1`, [userId]);
  await db.end();
});

describe("POST /auth/refresh", () => {
  it("issues a new token pair and retires the old refresh token", async () => {
    const first = await login();
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: first.refresh_token });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toEqual(expect.any(String));
    expect(res.body.refresh_token).toEqual(expect.any(String));
    expect(res.body.refresh_token).not.toBe(first.refresh_token);
    expect(res.body.user).toMatchObject({ id: userId, role: "STORE_OWNER" });

    const { rows } = await db.query(
      `SELECT refresh_token_hash FROM user_sessions WHERE user_id = $1`,
      [userId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].refresh_token_hash).toBe(
      hashRefreshToken(res.body.refresh_token),
    );
  });

  it("returns an access token that works on a protected route", async () => {
    const first = await login();
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: first.refresh_token });

    const protectedRes = await request(app)
      .get("/stores/mine")
      .set("Authorization", `Bearer ${res.body.access_token}`);
    expect(protectedRes.status).toBe(200);
  });

  it("rejects a refresh token that was already used", async () => {
    const first = await login();
    await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: first.refresh_token });

    const replay = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: first.refresh_token });
    expect(replay.status).toBe(401);
    expect(replay.body.error).toMatch(/invalid or expired/i);
  });

  it("lets only one of two simultaneous requests with the same token succeed", async () => {
    const first = await login();
    const [a, b] = await Promise.all([
      request(app)
        .post("/auth/refresh")
        .send({ refresh_token: first.refresh_token }),
      request(app)
        .post("/auth/refresh")
        .send({ refresh_token: first.refresh_token }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 401]);
  });

  it("rejects an unknown token", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: "nope" });
    expect(res.status).toBe(401);
  });

  it("rejects an expired session", async () => {
    const first = await login();
    await db.query(
      `UPDATE user_sessions SET expires_at = NOW() - INTERVAL '1 minute' WHERE user_id = $1`,
      [userId],
    );
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: first.refresh_token });
    expect(res.status).toBe(401);
  });

  it("refuses suspended users and does not keep their session", async () => {
    const first = await login();
    await db.query(`UPDATE users SET is_suspended = true WHERE id = $1`, [
      userId,
    ]);
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: first.refresh_token });
    expect(res.status).toBe(403);

    const { rows } = await db.query(
      `SELECT 1 FROM user_sessions WHERE user_id = $1`,
      [userId],
    );
    expect(rows).toHaveLength(0);
  });

  it("validates the body", async () => {
    const missing = await request(app).post("/auth/refresh").send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error).toBe("Validation failed");
  });

  it("does not accept the access token as a refresh token", async () => {
    const first = await login();
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: first.access_token });
    expect(res.status).toBe(401);
  });

  it("keeps other devices signed in when one refreshes", async () => {
    const phone = await login();
    const laptop = await login();
    await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: phone.refresh_token });

    const res = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: laptop.refresh_token });
    expect(res.status).toBe(200);
  });

  it("includes the owner's store id when they have one", async () => {
    const { rows } = await db.query(
      `INSERT INTO stores (owner_id, name, address, latitude, longitude, opening_hours)
       VALUES ($1, 'Refresh Store', '1 Test St', 1, 1, '{}') RETURNING id`,
      [userId],
    );
    try {
      const first = await login();
      expect(first.user.store_id).toBe(rows[0].id);
      const res = await request(app)
        .post("/auth/refresh")
        .send({ refresh_token: first.refresh_token });
      expect(res.body.user.store_id).toBe(rows[0].id);
    } finally {
      await db.query(`DELETE FROM stores WHERE id = $1`, [rows[0].id]);
    }
  });
});

describe("POST /auth/logout", () => {
  it("revokes the refresh token and is idempotent", async () => {
    const first = await login();
    const out = await request(app)
      .post("/auth/logout")
      .send({ refresh_token: first.refresh_token });
    expect(out.status).toBe(204);

    const again = await request(app)
      .post("/auth/logout")
      .send({ refresh_token: first.refresh_token });
    expect(again.status).toBe(204);

    const refresh = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: first.refresh_token });
    expect(refresh.status).toBe(401);
  });

  it("only revokes the session it was given", async () => {
    const phone = await login();
    const laptop = await login();
    await request(app)
      .post("/auth/logout")
      .send({ refresh_token: phone.refresh_token });
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: laptop.refresh_token });
    expect(res.status).toBe(200);
  });

  it("validates the body", async () => {
    const res = await request(app).post("/auth/logout").send({});
    expect(res.status).toBe(400);
  });
});

describe("password reset interaction", () => {
  it("a password reset signs out every refresh token", async () => {
    const first = await login();
    const raw = "reset-token-for-refresh-test";
    const crypto = await import("crypto");
    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [userId, crypto.createHash("sha256").update(raw).digest("hex")],
    );
    const reset = await request(app)
      .post("/auth/reset-password")
      .send({ token: raw, new_password: "brandNewPass99" });
    expect(reset.status).toBe(200);

    const refresh = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: first.refresh_token });
    expect(refresh.status).toBe(401);

    const relogin = await request(app)
      .post("/auth/login")
      .send({ email, password: "brandNewPass99" });
    expect(relogin.status).toBe(200);
  });
});
