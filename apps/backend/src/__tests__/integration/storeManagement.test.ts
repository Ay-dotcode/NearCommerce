import {
  cleanupFixtures,
  createTestProduct,
  createTestStore,
  createTestUser,
  TestUser,
} from "@/__tests__/helpers/fixtures";
import { app } from "@/app";
import { db } from "@/config/database";
import { MAX_STORES_PER_OWNER, OPEN_WEEK } from "@/constants";
import request from "supertest";

const validBody = {
  name: "Corner Market",
  description: "Fresh produce",
  address: "12 Main Street, Nicosia",
  latitude: 35.17,
  longitude: 33.36,
  timezone: "Asia/Nicosia",
  openingHours: OPEN_WEEK,
};

describe("Store management API", () => {
  let owner: TestUser;
  let otherOwner: TestUser;
  let customer: TestUser;

  beforeAll(async () => {
    owner = await createTestUser("STORE_OWNER");
    otherOwner = await createTestUser("STORE_OWNER");
    customer = await createTestUser("CUSTOMER");
  });

  afterAll(async () => {
    await cleanupFixtures();
    await db.end();
  });

  describe("GET /stores/mine", () => {
    it("requires authentication", async () => {
      expect((await request(app).get("/stores/mine")).status).toBe(401);
    });

    it("explains the portal is for owners when a customer logs in", async () => {
      const res = await request(app)
        .get("/stores/mine")
        .set("Authorization", `Bearer ${customer.token}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe("OWNER_ROLE_REQUIRED");
      expect(res.body.error).toMatch(/store owners/i);
    });

    it("returns an empty list for an owner with no stores (not a 500 from /:storeId)", async () => {
      const res = await request(app)
        .get("/stores/mine")
        .set("Authorization", `Bearer ${owner.token}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it("returns only the caller's stores, on both route prefixes", async () => {
      const mine = await createTestStore(owner.id, "Mine");
      await createTestStore(otherOwner.id, "Not mine");

      for (const prefix of ["/stores", "/api/stores"]) {
        const res = await request(app)
          .get(`${prefix}/mine`)
          .set("Authorization", `Bearer ${owner.token}`);
        expect(res.status).toBe(200);
        expect(res.body.data.map((s: any) => s.id)).toEqual([mine]);
        expect(res.body.data[0]).toMatchObject({
          name: "Mine",
          is_suspended: false,
        });
      }
      await db.query("DELETE FROM stores WHERE owner_id = $1", [owner.id]);
    });
  });

  describe("GET /stores/:storeId", () => {
    it("returns 404 (not 500) for a non-UUID id", async () => {
      const res = await request(app).get("/stores/not-a-uuid");
      expect(res.status).toBe(404);
    });

    it("hides stores whose owner is suspended (SRS 3.2.1)", async () => {
      const suspendedOwner = await createTestUser("STORE_OWNER", {
        suspended: true,
      });
      const storeId = await createTestStore(suspendedOwner.id);
      const res = await request(app).get(`/stores/${storeId}`);
      expect(res.status).toBe(404);
    });

    it("includes address and description for shoppers", async () => {
      const storeId = await createTestStore(owner.id);
      const res = await request(app).get(`/stores/${storeId}`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty("address", "1 Test Street");
      expect(res.body.data).toHaveProperty("is_open_now");
      await db.query("DELETE FROM stores WHERE id = $1", [storeId]);
    });
  });

  describe("POST /stores", () => {
    afterEach(() =>
      db.query("DELETE FROM stores WHERE owner_id = $1", [owner.id]),
    );

    it("rejects unauthenticated and non-owner callers", async () => {
      expect((await request(app).post("/stores").send(validBody)).status).toBe(
        401,
      );
      const res = await request(app)
        .post("/stores")
        .set("Authorization", `Bearer ${customer.token}`)
        .send(validBody);
      expect(res.status).toBe(403);
    });

    it("creates a store for the caller and normalises opening hours", async () => {
      const res = await request(app)
        .post("/stores")
        .set("Authorization", `Bearer ${owner.token}`)
        .send(validBody);
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: "Corner Market",
        owner_id: owner.id,
        timezone: "Asia/Nicosia",
        is_suspended: false,
      });
      expect(res.body.data.opening_hours.sunday).toEqual({
        open: "00:00",
        close: "00:00",
        isClosed: true,
      });
      expect(res.body.data.opening_hours.monday.isClosed).toBe(false);
    });

    it("returns field-level validation details", async () => {
      const res = await request(app)
        .post("/stores")
        .set("Authorization", `Bearer ${owner.token}`)
        .send({
          ...validBody,
          latitude: 999,
          openingHours: { monday: { open: "18:00", close: "09:00" } },
        });
      expect(res.status).toBe(400);
      const paths = res.body.details.map((d: any) => d.path);
      expect(paths).toContain("latitude");
      expect(paths).toContain("openingHours.monday.close");
    });

    it("rejects the snake_case `opening_hours` key the old onboarding page sent", async () => {
      const { openingHours, ...rest } = validBody;
      const res = await request(app)
        .post("/stores")
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ ...rest, opening_hours: openingHours });
      expect(res.status).toBe(400);
    });

    it("rejects an unknown timezone", async () => {
      const res = await request(app)
        .post("/stores")
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ ...validBody, timezone: "Mars/Olympus" });
      expect(res.status).toBe(400);
      expect(res.body.details[0].path).toBe("timezone");
    });

    it(`enforces the ${MAX_STORES_PER_OWNER}-store cap`, async () => {
      for (let i = 0; i < MAX_STORES_PER_OWNER; i++)
        await createTestStore(owner.id, `S${i}`);
      const res = await request(app)
        .post("/stores")
        .set("Authorization", `Bearer ${owner.token}`)
        .send(validBody);
      expect(res.status).toBe(409);
    });
  });

  describe("PUT/PATCH /stores/:storeId", () => {
    let storeId: string;
    beforeEach(async () => {
      storeId = await createTestStore(owner.id, "Before");
    });
    afterEach(() =>
      db.query("DELETE FROM stores WHERE owner_id = $1", [owner.id]),
    );

    it("updates only the supplied fields", async () => {
      const res = await request(app)
        .patch(`/stores/${storeId}`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ name: "After", openingHours: OPEN_WEEK });
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        name: "After",
        address: "1 Test Street",
      });
      expect(res.body.data.opening_hours.monday.open).toBe("09:00");
    });

    it("also accepts PUT (used by the existing StoreProfile page)", async () => {
      const res = await request(app)
        .put(`/stores/${storeId}`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ address: "99 New Road, Limassol" });
      expect(res.status).toBe(200);
      expect(res.body.data.address).toBe("99 New Road, Limassol");
    });

    it("forbids another owner", async () => {
      const res = await request(app)
        .patch(`/stores/${storeId}`)
        .set("Authorization", `Bearer ${otherOwner.token}`)
        .send({ name: "Hijack" });
      expect(res.status).toBe(403);
      const { rows } = await db.query("SELECT name FROM stores WHERE id = $1", [
        storeId,
      ]);
      expect(rows[0].name).toBe("Before");
    });

    it("rejects an empty body and an unknown store", async () => {
      expect(
        (
          await request(app)
            .patch(`/stores/${storeId}`)
            .set("Authorization", `Bearer ${owner.token}`)
            .send({})
        ).status,
      ).toBe(400);
      const unknown = "00000000-0000-4000-8000-000000000000";
      expect(
        (
          await request(app)
            .patch(`/stores/${unknown}`)
            .set("Authorization", `Bearer ${owner.token}`)
            .send({ name: "Nope" })
        ).status,
      ).toBe(404);
    });
  });

  describe("DELETE /stores/:storeId", () => {
    it("deletes the store and cascades to its products", async () => {
      const storeId = await createTestStore(owner.id);
      const productId = await createTestProduct(storeId);

      const res = await request(app)
        .delete(`/stores/${storeId}`)
        .set("Authorization", `Bearer ${owner.token}`);
      expect(res.status).toBe(204);

      expect(
        (await db.query("SELECT 1 FROM stores WHERE id = $1", [storeId]))
          .rowCount,
      ).toBe(0);
      expect(
        (await db.query("SELECT 1 FROM products WHERE id = $1", [productId]))
          .rowCount,
      ).toBe(0);
    });

    it("forbids another owner and leaves the store intact", async () => {
      const storeId = await createTestStore(owner.id);
      const res = await request(app)
        .delete(`/stores/${storeId}`)
        .set("Authorization", `Bearer ${otherOwner.token}`);
      expect(res.status).toBe(403);
      expect(
        (await db.query("SELECT 1 FROM stores WHERE id = $1", [storeId]))
          .rowCount,
      ).toBe(1);
      await db.query("DELETE FROM stores WHERE id = $1", [storeId]);
    });
  });
});
