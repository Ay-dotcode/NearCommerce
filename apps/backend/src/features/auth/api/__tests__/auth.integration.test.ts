import { app } from "@/app";
import { db } from "@/config/database";
import request from "supertest";

describe("POST /auth/register", () => {
  const testUser = {
    email: "test@example.com",
    password: "securepassword123",
    full_name: "Test User",
  };

  beforeEach(async () => {
    // Clean up DB before each test
    await db.query("DELETE FROM users WHERE email = $1", [testUser.email]);
  });

  afterAll(async () => {
    // Close DB pool when tests finish
    await db.end();
  });

  it("should register a new user successfully and return 201", async () => {
    const response = await request(app).post("/auth/register").send(testUser);

    expect(response.status).toBe(201);
    expect(response.body.message).toMatch(/registered successfully/i);

    // Verify database state
    const userResult = await db.query("SELECT * FROM users WHERE email = $1", [
      testUser.email,
    ]);
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
