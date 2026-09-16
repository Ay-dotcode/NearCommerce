import { app } from "@/app";
import { db } from "@/config/database";
import request from "supertest";

jest.mock("@/utils/circuitBreaker", () => {
  const actual = jest.requireActual("@/utils/circuitBreaker");
  return {
    ...actual,
    fetchGeminiEmbedding: jest
      .fn()
      .mockRejectedValue(new Error("Simulated AI search failure for testing")),
  };
});

describe("GET /search", () => {
  let storeId: string;
  let warnSpy: jest.SpyInstance;

  beforeAll(async () => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

    // 0. Seed a dedicated owner user for this test suite
    const userRes = await db.query(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ('search-test-owner@nearcommerce.test', 'hashed_pw', 'Search Test Owner', 'STORE_OWNER')
      ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
    `);
    const ownerId = userRes.rows[0].id;

    // 1. Create a dummy store in Lefke
    const storeRes = await db.query(
      `
      INSERT INTO stores (owner_id, name, address, latitude, longitude, opening_hours)
      VALUES ($1, 'Lefke Market', 'Lefke Center', 35.14, 32.83, '{}')
      RETURNING id
      `,
      [ownerId],
    );
    storeId = storeRes.rows[0].id;

    // 2. Insert test products verifying the strict rules.
    //    Note: publish_image_check requires image_url when is_published = true.
    await db.query(
      `
      INSERT INTO products (store_id, name, price, quantity, is_published, image_url) VALUES
      ($1, 'Fresh Milk',    2.50, 10, true,  'https://cdn.nearcommerce.test/fresh-milk.jpg'),
      ($1, 'Draft Milk',    2.00,  5, false, NULL),
      ($1, 'Sold Out Milk', 2.50,  0, true,  'https://cdn.nearcommerce.test/sold-out-milk.jpg')
      `,
      [storeId],
    );
  });

  afterAll(async () => {
    warnSpy.mockRestore();
    // CASCADE on stores deletes products; then remove the test user
    await db.query("DELETE FROM stores WHERE name = 'Lefke Market'");
    await db.query(
      "DELETE FROM users WHERE email = 'search-test-owner@nearcommerce.test'",
    );
    await db.end();
  });

  it("should return published, in-stock products within radius and use fallback if AI fails", async () => {
    const response = await request(app)
      .get("/search")
      .query({ q: "Milk", lat: 35.14, lng: 32.83, radius_meters: 5000 });

    expect(response.status).toBe(200);
    expect(response.body.used_fallback).toBe(true); // Because our Gemini stub throws

    const results = response.body.data;
    expect(results.length).toBe(1); // Should only return the 1 valid product
    expect(results[0].name).toBe("Fresh Milk");
  });

  it("should fail validation if lat/lng are missing", async () => {
    const response = await request(app).get("/search").query({ q: "Milk" });
    expect(response.status).toBe(400);
  });
});
