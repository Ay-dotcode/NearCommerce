import { app } from "@/app";
import { db } from "@/config/database";
import redisClient, { connectRedis } from "@/config/redis";
import { resendVerificationLimiter } from "@/middleware/rateLimiter";
import { sendVerificationEmail } from "@/utils/email";
import { generateMockToken } from "@/utils/testAuth";
import request from "supertest";

jest.mock("@/utils/email", () => ({
  ...jest.requireActual("@/utils/email"),
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
}));
const sendEmail = sendVerificationEmail as jest.Mock;

const user = {
  email: "verify-flow@example.com",
  password: "securepassword123",
  full_name: "Verify Flow",
};

// The raw token only ever exists in the email, so read it from the mocked mailer.
const lastToken = () => sendEmail.mock.calls.at(-1)![1] as string;
const userRow = async () =>
  (await db.query("SELECT * FROM users WHERE email = $1", [user.email]))
    .rows[0];
const tokenRows = async () =>
  (
    await db.query(
      `SELECT * FROM email_verification_tokens WHERE user_id = $1`,
      [(await userRow()).id],
    )
  ).rows;

describe("Email verification flow", () => {
  beforeAll(async () => {
    await connectRedis();
  });

  beforeEach(async () => {
    sendEmail.mockClear();
    await db.query("DELETE FROM users WHERE email = $1", [user.email]);
    for (const ip of ["127.0.0.1", "::ffff:127.0.0.1", "::1"])
      resendVerificationLimiter.resetKey(ip);
  });

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email = $1", [user.email]);
    await db.end();
    await redisClient.quit();
  });

  const register = () => request(app).post("/auth/register").send(user);

  it("emails a verification token on registration and stores only its hash", async () => {
    expect((await register()).status).toBe(201);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(user.email, expect.any(String));
    const [row] = await tokenRows();
    expect(row.token_hash).toHaveLength(64);
    expect(row.token_hash).not.toBe(lastToken());
    const hours = (new Date(row.expires_at).getTime() - Date.now()) / 36e5;
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThanOrEqual(24);
  });

  it("still creates the account when the email cannot be sent", async () => {
    sendEmail.mockRejectedValueOnce(new Error("SMTP down"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    expect((await register()).status).toBe(201);
    expect((await userRow()).email_verified_at).toBeNull();
    (console.error as jest.Mock).mockRestore();
  });

  it("verifies the account with the emailed token, once", async () => {
    await register();
    const token = lastToken();

    const ok = await request(app).post("/auth/verify-email").send({ token });
    expect(ok.status).toBe(200);
    expect((await userRow()).email_verified_at).not.toBeNull();
    expect(await tokenRows()).toHaveLength(0);

    const again = await request(app).post("/auth/verify-email").send({ token });
    expect(again.status).toBe(400);
  });

  it("rejects unknown, expired and missing tokens", async () => {
    await register();
    const bad = await request(app)
      .post("/auth/verify-email")
      .send({ token: "nope" });
    expect(bad.status).toBe(400);
    expect(bad.body.error).toMatch(/invalid or expired/i);

    await db.query(
      `UPDATE email_verification_tokens SET expires_at = NOW() - INTERVAL '1 minute'`,
    );
    const expired = await request(app)
      .post("/auth/verify-email")
      .send({ token: lastToken() });
    expect(expired.status).toBe(400);
    expect((await userRow()).email_verified_at).toBeNull();

    const missing = await request(app).post("/auth/verify-email").send({});
    expect(missing.status).toBe(400);
    expect(missing.body.error).toBe("Validation failed");
  });

  describe("POST /auth/resend-verification", () => {
    it("replaces the old token with a new one", async () => {
      await register();
      const first = lastToken();

      const res = await request(app)
        .post("/auth/resend-verification")
        .send({ email: user.email });
      expect(res.status).toBe(200);
      expect(sendEmail).toHaveBeenCalledTimes(2);
      expect(await tokenRows()).toHaveLength(1);

      const stale = await request(app)
        .post("/auth/verify-email")
        .send({ token: first });
      expect(stale.status).toBe(400);
      const fresh = await request(app)
        .post("/auth/verify-email")
        .send({ token: lastToken() });
      expect(fresh.status).toBe(200);
    });

    it("answers the same and sends nothing for verified or unknown emails", async () => {
      await register();
      await db.query(
        `UPDATE users SET email_verified_at = NOW() WHERE email = $1`,
        [user.email],
      );
      sendEmail.mockClear();

      const verified = await request(app)
        .post("/auth/resend-verification")
        .send({ email: user.email });
      const unknown = await request(app)
        .post("/auth/resend-verification")
        .send({ email: "ghost@example.com" });

      expect(verified.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(unknown.body).toEqual(verified.body);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("validates the email address", async () => {
      const res = await request(app)
        .post("/auth/resend-verification")
        .send({ email: "not-an-email" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /users/me", () => {
    it("reports whether the signed-in user has verified their email", async () => {
      await register();
      const { id } = await userRow();
      const auth = `Bearer ${generateMockToken(id)}`;

      const before = await request(app)
        .get("/api/users/me")
        .set("Authorization", auth);
      expect(before.status).toBe(200);
      expect(before.body).toMatchObject({
        id,
        email: user.email,
        full_name: user.full_name,
        email_verified: false,
      });
      expect(before.body).not.toHaveProperty("password_hash");

      await request(app)
        .post("/auth/verify-email")
        .send({ token: lastToken() });
      const after = await request(app)
        .get("/api/users/me")
        .set("Authorization", auth);
      expect(after.body.email_verified).toBe(true);
    });

    it("requires authentication", async () => {
      expect((await request(app).get("/api/users/me")).status).toBe(401);
    });
  });
});
