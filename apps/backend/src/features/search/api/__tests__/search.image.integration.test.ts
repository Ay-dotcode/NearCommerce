import { app } from "@/app";
import { db } from "@/config/database";
import { MAX_IMAGE_SEARCH_BASE64_CHARS } from "@/constants";
import { describeProductImage } from "@/utils/circuitBreaker";
import request from "supertest";

jest.mock("@/utils/circuitBreaker", () => {
  const actual = jest.requireActual("@/utils/circuitBreaker");
  return {
    ...actual,
    fetchGeminiEmbedding: jest
      .fn()
      .mockRejectedValue(new Error("Simulated AI search failure for testing")),
    describeProductImage: jest.fn(),
  };
});
const describeImage = describeProductImage as jest.Mock;

describe("POST /search/image", () => {
  let warnSpy: jest.SpyInstance;

  beforeAll(async () => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { rows } = await db.query(`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES ('image-search-owner@nearcommerce.test', 'hashed_pw', 'Image Owner', 'STORE_OWNER')
      ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
      RETURNING id
    `);
    const store = await db.query(
      `INSERT INTO stores (owner_id, name, address, latitude, longitude, opening_hours)
       VALUES ($1, 'Photo Market', 'Lefke', 35.14, 32.83, '{}') RETURNING id`,
      [rows[0].id],
    );
    await db.query(
      `INSERT INTO products (store_id, name, price, quantity, is_published, image_url) VALUES
       ($1, 'Whole Milk', 2.5, 10, true, 'https://cdn.nearcommerce.test/milk.jpg'),
       ($1, 'Orange Juice', 3, 4, true, 'https://cdn.nearcommerce.test/oj.jpg')`,
      [store.rows[0].id],
    );
  });

  afterAll(async () => {
    warnSpy.mockRestore();
    await db.query("DELETE FROM stores WHERE name = 'Photo Market'");
    await db.query(
      "DELETE FROM users WHERE email = 'image-search-owner@nearcommerce.test'",
    );
    await db.end();
  });

  beforeEach(() => describeImage.mockReset());

  const body = (over: Record<string, unknown> = {}) => ({
    image: "QUJDRA==",
    mime_type: "image/jpeg",
    lat: 35.14,
    lng: 32.83,
    radius_meters: 5000,
    ...over,
  });
  const post = (b: unknown) =>
    request(app)
      .post("/search/image")
      .send(b as object);

  it("finds nearby products matching what the photo shows", async () => {
    describeImage.mockResolvedValue("whole milk");
    const res = await post(body());

    expect(res.status).toBe(200);
    expect(describeImage).toHaveBeenCalledWith("QUJDRA==", "image/jpeg", 8000);
    expect(res.body.detected_query).toBe("whole milk");
    expect(res.body.data.map((p: { name: string }) => p.name)).toContain(
      "Whole Milk",
    );
    // Same card fields as text search
    expect(res.body.data[0]).toHaveProperty("in_stock");
    expect(res.body.data[0]).toHaveProperty("isStale");
  });

  it("reports when the photo shows no product", async () => {
    describeImage.mockResolvedValue(null);
    const res = await post(body());
    expect(res.status).toBe(422);
    expect(res.body.code).toBe("NO_PRODUCT_DETECTED");
  });

  it("returns 503 VISION_UNAVAILABLE when the vision model fails", async () => {
    describeImage.mockRejectedValue(new Error("Gemini API 503"));
    const res = await post(body());
    expect(res.status).toBe(503);
    expect(res.body.code).toBe("VISION_UNAVAILABLE");
  });

  it.each([
    ["missing image", { image: undefined }],
    ["non-base64 image", { image: "not base64!!" }],
    ["unsupported type", { mime_type: "image/gif" }],
    ["bad latitude", { lat: 120 }],
  ])("rejects a request with %s", async (_name, over) => {
    const res = await post(body(over));
    expect(res.status).toBe(400);
    expect(describeImage).not.toHaveBeenCalled();
  });

  it("rejects oversized photos before calling the vision model", async () => {
    const res = await post(
      body({ image: "A".repeat(MAX_IMAGE_SEARCH_BASE64_CHARS + 4) }),
    );
    expect(res.status).toBe(413);
    expect(describeImage).not.toHaveBeenCalled();
  });
});
