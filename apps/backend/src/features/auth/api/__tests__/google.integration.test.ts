import { app } from "@/app";
import { db } from "@/config/database";
import redisClient, { connectRedis } from "@/config/redis";
import {
  GoogleAuthError,
  verifyGoogleIdToken,
  type GoogleProfile,
} from "@/features/auth/services/googleVerifier.service";
import bcrypt from "bcrypt";
import request from "supertest";

jest.mock("@/features/auth/services/googleVerifier.service", () => ({
  ...jest.requireActual("@/features/auth/services/googleVerifier.service"),
  verifyGoogleIdToken: jest.fn(),
}));
const verify = verifyGoogleIdToken as jest.MockedFunction<
  typeof verifyGoogleIdToken
>;

const EMAIL = "google.user@example.com";
const profile = (over: Partial<GoogleProfile> = {}): GoogleProfile => ({
  subject: "google-sub-123",
  email: EMAIL,
  emailVerified: true,
  name: "Grace Hopper",
  ...over,
});
const signIn = (body: Record<string, unknown> = {}) =>
  request(app)
    .post("/auth/google")
    .send({ id_token: "token", ...body });

describe("POST /auth/google", () => {
  beforeAll(async () => {
    await connectRedis();
  });
  beforeEach(async () => {
    verify.mockReset();
    verify.mockResolvedValue(profile());
    await db.query("DELETE FROM users WHERE email = $1", [EMAIL]);
  });
  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email = $1", [EMAIL]);
    await db.end();
    await redisClient.quit();
  });

  it("creates a shopper account on first sign-in, with a session and a starting list", async () => {
    const res = await signIn();
    expect(res.status).toBe(201);
    expect(res.body.is_new_user).toBe(true);
    expect(res.body.access_token).toEqual(expect.any(String));
    expect(res.body.refresh_token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      role: "CUSTOMER",
      email_verified: true,
    });

    const user = await db.query(
      "SELECT id, password_hash, full_name, email_verified_at FROM users WHERE email = $1",
      [EMAIL],
    );
    expect(user.rows[0].password_hash).toBeNull();
    expect(user.rows[0].full_name).toBe("Grace Hopper");
    expect(user.rows[0].email_verified_at).not.toBeNull();

    const identity = await db.query(
      "SELECT provider, provider_subject FROM auth_identities WHERE user_id = $1",
      [user.rows[0].id],
    );
    expect(identity.rows).toEqual([
      { provider: "google", provider_subject: "google-sub-123" },
    ]);

    const lists = await db.query(
      "SELECT 1 FROM household_list_members WHERE user_id = $1",
      [user.rows[0].id],
    );
    expect(lists.rows.length).toBeGreaterThan(0);
  });

  it("creates a store owner when the portal asks for one", async () => {
    const res = await signIn({ role: "STORE_OWNER" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("STORE_OWNER");
  });

  it("signs the same Google account in again without creating a second account", async () => {
    await signIn();
    const res = await signIn({ role: "STORE_OWNER" });
    expect(res.status).toBe(200);
    expect(res.body.is_new_user).toBe(false);
    // The existing account keeps its role; the requested role only applies to new accounts.
    expect(res.body.user.role).toBe("CUSTOMER");
    const count = await db.query(
      "SELECT COUNT(*)::int AS n FROM users WHERE email = $1",
      [EMAIL],
    );
    expect(count.rows[0].n).toBe(1);
  });

  it("still finds the account after the Google email address changes", async () => {
    await signIn();
    verify.mockResolvedValue(profile({ email: "renamed@example.com" }));
    const res = await signIn();
    expect(res.status).toBe(200);
    expect(res.body.is_new_user).toBe(false);
  });

  it("does not link Google to an existing password account", async () => {
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
       VALUES ($1, $2, 'Existing', 'CUSTOMER', NOW())`,
      [EMAIL, await bcrypt.hash("password123", 4)],
    );
    const res = await signIn();
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("EMAIL_EXISTS_USE_PASSWORD");
    const links = await db.query(
      "SELECT 1 FROM auth_identities WHERE provider_subject = 'google-sub-123'",
    );
    expect(links.rows).toHaveLength(0);
  });

  it("refuses a Google account whose email is not verified", async () => {
    verify.mockResolvedValue(profile({ emailVerified: false }));
    const res = await signIn();
    expect(res.status).toBe(401);
    const users = await db.query("SELECT 1 FROM users WHERE email = $1", [
      EMAIL,
    ]);
    expect(users.rows).toHaveLength(0);
  });

  it("rejects a token that cannot be trusted", async () => {
    verify.mockRejectedValue(
      new GoogleAuthError(401, "Google sign-in failed. Please try again."),
    );
    const res = await signIn();
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/google sign-in failed/i);
  });

  it("says so when Google sign-in is not configured", async () => {
    verify.mockRejectedValue(
      new GoogleAuthError(
        503,
        "Google sign-in is not configured on this server.",
      ),
    );
    expect((await signIn()).status).toBe(503);
  });

  it("refuses a suspended account", async () => {
    await signIn();
    await db.query("UPDATE users SET is_suspended = true WHERE email = $1", [
      EMAIL,
    ]);
    const res = await signIn();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("ACCOUNT_SUSPENDED");
    expect(res.body.access_token).toBeUndefined();
  });

  it("never lets an administrator sign in with Google", async () => {
    await signIn();
    await db.query("UPDATE users SET role = 'SYSTEM_ADMIN' WHERE email = $1", [
      EMAIL,
    ]);
    const res = await signIn();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("GOOGLE_NOT_ALLOWED");
    expect(res.body.access_token).toBeUndefined();
  });

  it("does not let a Google-only account log in with a password", async () => {
    await signIn();
    const res = await request(app)
      .post("/auth/login")
      .send({ email: EMAIL, password: "anything-at-all" });
    expect(res.status).toBe(401);
  });

  it("validates the request body", async () => {
    expect((await request(app).post("/auth/google").send({})).status).toBe(400);
    expect((await signIn({ role: "SYSTEM_ADMIN" })).status).toBe(400);
    expect(verify).not.toHaveBeenCalled();
  });
});
