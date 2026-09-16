import { app } from "@/app";
import { db } from "@/config/database";
import { generateVerificationToken } from "@/features/auth/utils/crypto";
import { resendVerificationLimiter } from "@/middleware/rateLimiter";
import request from "supertest";

describe("Auth Integration Tests", () => {
  const testUser = {
    email: "test@example.com",
    password: "securepassword123",
    full_name: "Test User",
  };

  beforeEach(async () => {
    // Clean up DB before each test
    await db.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    resendVerificationLimiter.resetKey("127.0.0.1");
    resendVerificationLimiter.resetKey("::ffff:127.0.0.1");
    resendVerificationLimiter.resetKey("::1");
  });

  afterAll(async () => {
    // Clean up DB and close pool
    await db.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    await db.end();
  });

  describe("POST /auth/register", () => {
    it("should register a new user successfully and return 201", async () => {
      const response = await request(app).post("/auth/register").send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.message).toMatch(/registered successfully/i);

      // Verify database state
      const userResult = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [testUser.email],
      );
      expect(userResult.rows.length).toBe(1);
      expect(userResult.rows[0].role).toBe("CUSTOMER");

      // Verify token was generated
      const tokenResult = await db.query(
        "SELECT * FROM email_verification_tokens WHERE user_id = $1",
        [userResult.rows[0].id],
      );
      expect(tokenResult.rows.length).toBe(1);
    });

    it("should return 400 if validation fails", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ email: "not-an-email", password: "short" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
    });

    it("should return 409 if user already exists", async () => {
      await request(app).post("/auth/register").send(testUser);
      const response = await request(app).post("/auth/register").send(testUser);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe("Email already in use");
    });
  });

  describe("POST /auth/verify-email", () => {
    it("should return 400 if token is missing or empty", async () => {
      const response = await request(app)
        .post("/auth/verify-email")
        .send({ token: "" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
    });

    it("should return 400 if token is invalid", async () => {
      const response = await request(app)
        .post("/auth/verify-email")
        .send({ token: "invalid-token-12345" });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid or expired/i);
    });

    it("should return 400 if token is expired", async () => {
      // Create user and expired token
      const userRes = await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, 'hashed_pw', $2, 'CUSTOMER') RETURNING id`,
        [testUser.email, testUser.full_name],
      );
      const userId = userRes.rows[0].id;
      const { rawToken, tokenHash } = generateVerificationToken();
      const expiredDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago

      await db.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiredDate],
      );

      const response = await request(app)
        .post("/auth/verify-email")
        .send({ token: rawToken });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid or expired/i);
    });

    it("should successfully verify email with a valid token", async () => {
      // Create user and valid token
      const userRes = await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, 'hashed_pw', $2, 'CUSTOMER') RETURNING id`,
        [testUser.email, testUser.full_name],
      );
      const userId = userRes.rows[0].id;
      const { rawToken, tokenHash } = generateVerificationToken();
      const futureDate = new Date(Date.now() + 24 * 3600 * 1000);

      await db.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, futureDate],
      );

      const response = await request(app)
        .post("/auth/verify-email")
        .send({ token: rawToken });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/email verified successfully/i);

      // Verify email_verified_at is updated
      const updatedUser = await db.query(
        "SELECT email_verified_at FROM users WHERE id = $1",
        [userId],
      );
      expect(updatedUser.rows[0].email_verified_at).not.toBeNull();

      // Verify token is deleted
      const tokenCheck = await db.query(
        "SELECT * FROM email_verification_tokens WHERE user_id = $1",
        [userId],
      );
      expect(tokenCheck.rows.length).toBe(0);
    });
  });

  describe("POST /auth/resend-verification", () => {
    it("should return 400 if email is invalid", async () => {
      const response = await request(app)
        .post("/auth/resend-verification")
        .send({ email: "not-an-email" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
    });

    it("should return 200 without creating token if user does not exist (enumeration protection)", async () => {
      const response = await request(app)
        .post("/auth/resend-verification")
        .send({ email: "nonexistent@example.com" });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/if your email is registered/i);
    });

    it("should return 400 if email is already verified", async () => {
      await db.query(
        `INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
         VALUES ($1, 'hashed_pw', $2, 'CUSTOMER', NOW())`,
        [testUser.email, testUser.full_name],
      );

      const response = await request(app)
        .post("/auth/resend-verification")
        .send({ email: testUser.email });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/already verified/i);
    });

    it("should generate a new token and replace old ones for unverified user", async () => {
      const userRes = await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, 'hashed_pw', $2, 'CUSTOMER') RETURNING id`,
        [testUser.email, testUser.full_name],
      );
      const userId = userRes.rows[0].id;
      const { tokenHash } = generateVerificationToken();

      await db.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 day')`,
        [userId, tokenHash],
      );

      const response = await request(app)
        .post("/auth/resend-verification")
        .send({ email: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/if your email is registered/i);

      // Verify token was replaced with exactly 1 new active token
      const tokens = await db.query(
        "SELECT * FROM email_verification_tokens WHERE user_id = $1",
        [userId],
      );
      expect(tokens.rows.length).toBe(1);
      expect(tokens.rows[0].token_hash).not.toBe(tokenHash);
    });

    it("should return 429 after exceeding max resend requests", async () => {
      // Send 3 requests (the max limit)
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post("/auth/resend-verification")
          .send({ email: testUser.email });
      }

      // 4th request must be rate limited with 429
      const response = await request(app)
        .post("/auth/resend-verification")
        .send({ email: testUser.email });

      expect(response.status).toBe(429);
      expect(response.body.error).toMatch(/too many resend requests/i);
    });
  });
});
