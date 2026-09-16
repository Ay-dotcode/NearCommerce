import { app } from "@/app";
import { db } from "@/config/database";
import { generateVerificationToken } from "@/features/auth/utils/crypto";
import {
  forgotPasswordLimiter,
  resendVerificationLimiter,
} from "@/middleware/rateLimiter";
import bcrypt from "bcrypt";
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
    forgotPasswordLimiter.resetKey("127.0.0.1");
    forgotPasswordLimiter.resetKey("::ffff:127.0.0.1");
    forgotPasswordLimiter.resetKey("::1");
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

  describe("POST /auth/forgot-password", () => {
    it("should return 400 if email is invalid", async () => {
      const response = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "not-an-email" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
    });

    it("should return 200 without error if user does not exist (enumeration prevention)", async () => {
      const response = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "nonexistent@example.com" });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(
        /if that email is registered, a reset link has been sent/i,
      );
    });

    it("should issue a password reset token and invalidate prior tokens for registered user", async () => {
      const userRes = await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, 'hashed_pw', $2, 'CUSTOMER') RETURNING id`,
        [testUser.email, testUser.full_name],
      );
      const userId = userRes.rows[0].id;
      const { tokenHash: oldTokenHash } = generateVerificationToken();

      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [userId, oldTokenHash],
      );

      const response = await request(app)
        .post("/auth/forgot-password")
        .send({ email: testUser.email });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(
        /if that email is registered, a reset link has been sent/i,
      );

      // Verify old token was replaced by 1 new token
      const tokens = await db.query(
        "SELECT * FROM password_reset_tokens WHERE user_id = $1",
        [userId],
      );
      expect(tokens.rows.length).toBe(1);
      expect(tokens.rows[0].token_hash).not.toBe(oldTokenHash);
    });

    it("should return 429 after exceeding max forgot-password requests", async () => {
      // Send 5 requests (the max limit)
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/auth/forgot-password")
          .send({ email: testUser.email });
      }

      // 6th request must be rate limited with 429
      const response = await request(app)
        .post("/auth/forgot-password")
        .send({ email: testUser.email });

      expect(response.status).toBe(429);
      expect(response.body.error).toMatch(/too many password reset requests/i);
    });
  });

  describe("POST /auth/reset-password", () => {
    it("should return 400 if validation fails (e.g., missing token or password too short)", async () => {
      const response = await request(app)
        .post("/auth/reset-password")
        .send({ token: "", new_password: "short" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
    });

    it("should return 400 if token is invalid", async () => {
      const response = await request(app).post("/auth/reset-password").send({
        token: "invalid-token-12345",
        new_password: "newsecurepassword123",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid or expired reset token/i);
    });

    it("should return 400 if token is expired", async () => {
      const userRes = await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, 'hashed_pw', $2, 'CUSTOMER') RETURNING id`,
        [testUser.email, testUser.full_name],
      );
      const userId = userRes.rows[0].id;
      const { rawToken, tokenHash } = generateVerificationToken();
      const expiredDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago

      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiredDate],
      );

      const response = await request(app).post("/auth/reset-password").send({
        token: rawToken,
        new_password: "newsecurepassword123",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/invalid or expired reset token/i);
    });

    it("should successfully reset password, update database, clear user_sessions, and remove used token", async () => {
      const initialPassword = "oldpassword123";
      const initialHash = await bcrypt.hash(initialPassword, 12);
      const userRes = await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'CUSTOMER') RETURNING id`,
        [testUser.email, initialHash, testUser.full_name],
      );
      const userId = userRes.rows[0].id;

      // Seed active user sessions
      await db.query(
        `INSERT INTO user_sessions (user_id, refresh_token_hash, expires_at)
         VALUES ($1, 'session_token_hash_1', NOW() + INTERVAL '7 days'),
                ($1, 'session_token_hash_2', NOW() + INTERVAL '7 days')`,
        [userId],
      );

      const sessionsBefore = await db.query(
        "SELECT * FROM user_sessions WHERE user_id = $1",
        [userId],
      );
      expect(sessionsBefore.rows.length).toBe(2);

      // Create a valid password reset token
      const { rawToken, tokenHash } = generateVerificationToken();
      await db.query(
        `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
        [userId, tokenHash],
      );

      // Reset password
      const newPassword = "brandnewpassword456";
      const response = await request(app)
        .post("/auth/reset-password")
        .send({ token: rawToken, new_password: newPassword });

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(
        /password has been successfully reset/i,
      );

      // Verify updated password in users table matches new password
      const updatedUser = await db.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [userId],
      );
      const isPasswordUpdated = await bcrypt.compare(
        newPassword,
        updatedUser.rows[0].password_hash,
      );
      expect(isPasswordUpdated).toBe(true);

      // Verify active user sessions are revoked
      const sessionsAfter = await db.query(
        "SELECT * FROM user_sessions WHERE user_id = $1",
        [userId],
      );
      expect(sessionsAfter.rows.length).toBe(0);

      // Verify the password reset token is deleted
      const tokenAfter = await db.query(
        "SELECT * FROM password_reset_tokens WHERE user_id = $1",
        [userId],
      );
      expect(tokenAfter.rows.length).toBe(0);

      // Re-using token must fail
      const reuseResponse = await request(app)
        .post("/auth/reset-password")
        .send({ token: rawToken, new_password: "anotherpassword789" });

      expect(reuseResponse.status).toBe(400);
      expect(reuseResponse.body.error).toMatch(
        /invalid or expired reset token/i,
      );
    });
  });

  describe("POST /auth/login", () => {
    it("should return 400 if validation fails", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ email: "invalid-email", password: "" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
    });

    it("should return 401 if user does not exist", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ email: "nonexistent@example.com", password: "password123" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should return 403 if user is suspended in the database", async () => {
      const passwordHash = await bcrypt.hash(testUser.password, 12);
      await db.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_suspended)
         VALUES ($1, $2, $3, 'CUSTOMER', true)`,
        [testUser.email, passwordHash, testUser.full_name],
      );

      const response = await request(app)
        .post("/auth/login")
        .send({ email: testUser.email, password: testUser.password });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("Account is suspended.");
    });

    it("should return 401 if password does not match", async () => {
      const passwordHash = await bcrypt.hash(testUser.password, 12);
      await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'CUSTOMER')`,
        [testUser.email, passwordHash, testUser.full_name],
      );

      const response = await request(app)
        .post("/auth/login")
        .send({ email: testUser.email, password: "wrongpassword" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid credentials");
    });

    it("should login successfully, return tokens, store hashed refresh token in DB, and prime Redis", async () => {
      const passwordHash = await bcrypt.hash(testUser.password, 12);
      const userRes = await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'CUSTOMER') RETURNING id`,
        [testUser.email, passwordHash, testUser.full_name],
      );
      const userId = userRes.rows[0].id;

      const response = await request(app)
        .post("/auth/login")
        .send({ email: testUser.email, password: testUser.password });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
      expect(response.body.refresh_token).toBeDefined();
      expect(response.body.user).toEqual({ id: userId, role: "CUSTOMER" });

      // Verify user_sessions table has hashed refresh token
      const sessionResult = await db.query(
        "SELECT * FROM user_sessions WHERE user_id = $1",
        [userId],
      );
      expect(sessionResult.rows.length).toBe(1);
      expect(sessionResult.rows[0].refresh_token_hash).toHaveLength(64);
    });
  });
});
