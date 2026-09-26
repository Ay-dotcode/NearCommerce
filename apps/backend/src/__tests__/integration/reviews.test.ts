import { app } from "@/app";
import { db } from "@/config/database";
import { generateMockToken } from "@/utils/testAuth";
import request from "supertest";

jest.setTimeout(30000);

describe("Community Ratings & Trust Gate API Integration", () => {
  let unverifiedUserId: string;
  let unverifiedToken: string;

  let verifiedUserId: string;
  let verifiedToken: string;

  let storeId: string;

  beforeAll(async () => {
    // 1. Setup unverified user
    const unverifiedRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name, email_verified_at) 
       VALUES ('unverified@test.com', 'hash', 'Unverified User', NULL) RETURNING id`,
    );
    unverifiedUserId = unverifiedRes.rows[0].id;
    unverifiedToken = generateMockToken(unverifiedUserId);

    // 2. Setup verified user
    const verifiedRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name, email_verified_at) 
       VALUES ('verified@test.com', 'hash', 'Verified User', NOW()) RETURNING id`,
    );
    verifiedUserId = verifiedRes.rows[0].id;
    verifiedToken = generateMockToken(verifiedUserId);

    // 3. Setup mock store
    const storeRes = await db.query(
      `INSERT INTO stores (owner_id, name, address, latitude, longitude, timezone, opening_hours) 
       VALUES ($1, 'Review Store', '123 Test', 0, 0, 'UTC', '{}') RETURNING id`,
      [verifiedUserId],
    );
    storeId = storeRes.rows[0].id;
  });

  afterAll(async () => {
    await db.query(
      `DELETE FROM users WHERE email IN ('unverified@test.com', 'verified@test.com')`,
    );
    await db.end();
  });

  it("should return 201 when an unverified user submits a review in MVP", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${unverifiedToken}`)
      .send({ storeId, rating: 5, comment: "Great store!" });

    expect(res.status).toBe(201);
  });

  it("should return 201 when a verified user submits a valid store review", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${verifiedToken}`)
      .send({ storeId, rating: 5, comment: "Great store!" });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.rating).toBe(5);
  });

  it("should return 400 when submitting a review with an invalid rating", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${verifiedToken}`)
      .send({ storeId, rating: 6 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/between 1 and 5/);
  });

  it("should return 409 if the same user tries to review the same store again", async () => {
    const res = await request(app)
      .post("/api/reviews")
      .set("Authorization", `Bearer ${verifiedToken}`)
      .send({ storeId, rating: 4 });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already reviewed/);
  });
});
