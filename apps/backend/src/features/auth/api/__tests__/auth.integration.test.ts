import { app } from "@/app";
import { db } from "@/config/database";
import redisClient, { connectRedis } from "@/config/redis";
import { LOGIN_MAX_FAILURES } from "@/constants";
import { clearLoginFailures } from "@/features/auth/services/loginLockout.service";
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

  beforeAll(async () => {
    await connectRedis();
  });

  beforeEach(async () => {
    // Clean up DB before each test
    await db.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    resendVerificationLimiter.resetKey("127.0.0.1");
    resendVerificationLimiter.resetKey("::ffff:127.0.0.1");
    resendVerificationLimiter.resetKey("::1");
    forgotPasswordLimiter.resetKey("127.0.0.1");
    forgotPasswordLimiter.resetKey("::ffff:127.0.0.1");
    forgotPasswordLimiter.resetKey("::1");
    for (const ip of ["127.0.0.1", "::ffff:127.0.0.1", "::1"]) {
      await clearLoginFailures(testUser.email, ip);
      await clearLoginFailures("nonexistent@example.com", ip);
    }
  }, 30000);

  afterAll(async () => {
    await db.query("DELETE FROM users WHERE email = $1", [testUser.email]);
    await db.end();
    await redisClient.quit();
  }, 30000);

  describe("POST /auth/register", () => {
    it("should register a new user successfully and return 201", async () => {
      const response = await request(app).post("/auth/register").send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.message).toMatch(/log in now/i);

      // Verify database state
      const userResult = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [testUser.email],
      );
      expect(userResult.rows.length).toBe(1);
      expect(userResult.rows[0].role).toBe("CUSTOMER");

      // Email verification is switched off: the account is usable at once and no token is made
      expect(userResult.rows[0].email_verified_at).not.toBeNull();
      const tokens = await db.query(
        "SELECT 1 FROM email_verification_tokens WHERE user_id = $1",
        [userResult.rows[0].id],
      );
      expect(tokens.rows).toHaveLength(0);
    });

    it("creates a STORE_OWNER when the store portal asks for one", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ ...testUser, role: "STORE_OWNER" });
      expect(response.status).toBe(201);

      const { rows } = await db.query(
        "SELECT role FROM users WHERE email = $1",
        [testUser.email],
      );
      expect(rows[0].role).toBe("STORE_OWNER");
    });

    it("never lets a sign-up choose the admin role", async () => {
      const response = await request(app)
        .post("/auth/register")
        .send({ ...testUser, role: "SYSTEM_ADMIN" });
      expect(response.status).toBe(400);

      const { rows } = await db.query("SELECT 1 FROM users WHERE email = $1", [
        testUser.email,
      ]);
      expect(rows).toHaveLength(0);
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

  describe("POST /auth/forgot-password", () => {
    it("returns 501 explaining password reset is disabled on mock app", async () => {
      const response = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "test@example.com" });

      expect(response.status).toBe(501);
      expect(response.body.error).toMatch(/password reset is disabled/i);
    });
  });

  describe("POST /auth/reset-password", () => {
    it("returns 501 explaining password reset is disabled on mock app", async () => {
      const response = await request(app)
        .post("/auth/reset-password")
        .send({ token: "any-token", new_password: "newsecurepassword123" });

      expect(response.status).toBe(501);
      expect(response.body.error).toMatch(/password reset is disabled/i);
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
      // Clients use the code to offer a "Contact support" link.
      expect(response.body.code).toBe("ACCOUNT_SUSPENDED");
    });

    it("does not reveal that an account is suspended without the right password", async () => {
      const passwordHash = await bcrypt.hash(testUser.password, 12);
      await db.query(
        `INSERT INTO users (email, password_hash, full_name, role, is_suspended)
         VALUES ($1, $2, $3, 'CUSTOMER', true)`,
        [testUser.email, passwordHash, testUser.full_name],
      );

      const response = await request(app)
        .post("/auth/login")
        .send({ email: testUser.email, password: "wrongpassword" });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe("Invalid credentials");
    });

    it("locks the account out after repeated failures and returns Retry-After", async () => {
      const passwordHash = await bcrypt.hash(testUser.password, 12);
      await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'CUSTOMER')`,
        [testUser.email, passwordHash, testUser.full_name],
      );

      for (let i = 0; i < LOGIN_MAX_FAILURES; i++) {
        const res = await request(app)
          .post("/auth/login")
          .send({ email: testUser.email, password: "wrongpassword" });
        expect(res.status).toBe(401);
      }

      // Even the correct password is refused while locked.
      const locked = await request(app)
        .post("/auth/login")
        .send({ email: testUser.email, password: testUser.password });
      expect(locked.status).toBe(429);
      expect(Number(locked.headers["retry-after"])).toBeGreaterThan(0);
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

    it.each([
      ["upper case", (e: string) => e.toUpperCase()],
      ["capitalised", (e: string) => e[0].toUpperCase() + e.slice(1)],
      ["surrounded by spaces", (e: string) => `  ${e} `],
    ])("logs in when the email is typed %s", async (_name, transform) => {
      const passwordHash = await bcrypt.hash(testUser.password, 12);
      await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'CUSTOMER')`,
        [testUser.email, passwordHash, testUser.full_name],
      );

      const response = await request(app)
        .post("/auth/login")
        .send({ email: transform(testUser.email), password: testUser.password });

      expect(response.status).toBe(200);
      expect(response.body.access_token).toBeDefined();
    });

    it("counts failed attempts across spellings of the same email", async () => {
      const passwordHash = await bcrypt.hash(testUser.password, 12);
      await db.query(
        `INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'CUSTOMER')`,
        [testUser.email, passwordHash, testUser.full_name],
      );
      // Alternating the case must not hand out a fresh set of attempts.
      for (let i = 0; i < LOGIN_MAX_FAILURES; i++)
        await request(app)
          .post("/auth/login")
          .send({
            email: i % 2 ? testUser.email.toUpperCase() : testUser.email,
            password: "wrongpassword",
          });

      const locked = await request(app)
        .post("/auth/login")
        .send({ email: testUser.email, password: testUser.password });
      expect(locked.status).toBe(429);
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
      expect(response.body.user).toEqual({
        id: userId,
        role: "CUSTOMER",
        email_verified: false,
      });

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
