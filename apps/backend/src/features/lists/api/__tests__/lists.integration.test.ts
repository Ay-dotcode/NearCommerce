jest.mock("@/config/socket", () => ({
  getIO: jest.fn().mockReturnValue({
    to: jest.fn().mockReturnValue({
      emit: jest.fn(),
    }),
  }),
}));

import { app } from "@/app";
import { db } from "@/config/database";
import jwt from "jsonwebtoken";
import request from "supertest";

const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "fallback_secret_do_not_use_in_prod";

describe("Lists API Integration Tests", () => {
  let ownerToken: string;
  let memberToken: string;
  let listId: string;
  let productId: string;

  beforeAll(async () => {
    // 1. Create Test Users
    const ownerRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name) VALUES ('owner@lists.local', 'hash', 'Owner') RETURNING id`,
    );
    const memberRes = await db.query(
      `INSERT INTO users (email, password_hash, full_name) VALUES ('member@lists.local', 'hash', 'Member') RETURNING id`,
    );
    const ownerId = ownerRes.rows[0].id;
    const memberId = memberRes.rows[0].id;

    // 2. Generate JWTs for auth middleware
    ownerToken = jwt.sign(
      { id: ownerId, role: "CUSTOMER" },
      JWT_ACCESS_SECRET,
      { expiresIn: "15m" },
    );
    memberToken = jwt.sign(
      { id: memberId, role: "CUSTOMER" },
      JWT_ACCESS_SECRET,
      { expiresIn: "15m" },
    );

    // 3. Create a Store and Product for the UPSERT test
    const storeRes = await db.query(
      `INSERT INTO stores (owner_id, name, address, latitude, longitude, opening_hours) VALUES ($1, 'List Store', 'Address', 0, 0, '{}') RETURNING id`,
      [ownerId],
    );
    const productRes = await db.query(
      `INSERT INTO products (store_id, name, price, quantity) VALUES ($1, 'Test Product', 10.00, 100) RETURNING id`,
      [storeRes.rows[0].id],
    );
    productId = productRes.rows[0].id;

    // 4. Create Household List and assign roles
    const listRes = await db.query(
      `INSERT INTO household_lists (name, invite_code) VALUES ('My House', 'TESTCODE') RETURNING id`,
    );
    listId = listRes.rows[0].id;

    await db.query(
      `INSERT INTO household_list_members (list_id, user_id, role) VALUES ($1, $2, 'OWNER')`,
      [listId, ownerId],
    );
    await db.query(
      `INSERT INTO household_list_members (list_id, user_id, role) VALUES ($1, $2, 'MEMBER')`,
      [listId, memberId],
    );
  });

  afterAll(async () => {
    // Teardown cascade deletes will handle most of this, but it's good practice to clean root entities
    await db.query(
      `DELETE FROM users WHERE email IN ('owner@lists.local', 'member@lists.local')`,
    );
    await db.end();
  });

  describe("POST /lists/:list_id/items", () => {
    it("should add a new item to the list", async () => {
      const response = await request(app)
        .post(`/lists/${listId}/items`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ list_id: listId, product_id: productId, quantity: 1 });

      expect(response.status).toBe(201);
      expect(response.body.quantity).toBe(1);
    });

    it("should UPSERT and bump quantity if the item already exists", async () => {
      // Add the identical product again
      const response = await request(app)
        .post(`/lists/${listId}/items`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ list_id: listId, product_id: productId, quantity: 2 });

      expect(response.status).toBe(201);
      expect(response.body.quantity).toBe(3); // 1 (previous) + 2 (new)
      expect(response.body.is_checked).toBe(false);
    });
    it("should reject unauthenticated requests with 401", async () => {
      const response = await request(app)
        .post(`/lists/${listId}/items`)
        .send({ list_id: listId, product_id: productId, quantity: 1 });

      expect(response.status).toBe(401);
    });

    it("should return 400 if validation fails (neither product_id nor custom_item_name)", async () => {
      const response = await request(app)
        .post(`/lists/${listId}/items`)
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ list_id: listId, quantity: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
    });
  });

  describe("POST /lists/:list_id/regenerate-invite", () => {
    it("should allow the list OWNER to regenerate the invite code", async () => {
      const response = await request(app)
        .post(`/lists/${listId}/regenerate-invite`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.invite_code).toBeDefined();
      expect(response.body.invite_code).not.toBe("TESTCODE");
    });

    it("should reject regeneration attempts by standard MEMBERS", async () => {
      const response = await request(app)
        .post(`/lists/${listId}/regenerate-invite`)
        .set("Authorization", `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/owners can regenerate/i);
    });

    it("should reject unauthenticated requests with 401", async () => {
      const response = await request(app).post(
        `/lists/${listId}/regenerate-invite`,
      );

      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid list_id format (not a UUID)", async () => {
      const response = await request(app)
        .post(`/lists/invalid-uuid-format/regenerate-invite`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Validation failed");
    });
  });
});
