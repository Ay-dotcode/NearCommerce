import {
  ALWAYS_OPEN,
  TestUser,
  cleanupFixtures,
  createTestStore,
  createTestUser,
} from "@/__tests__/helpers/fixtures";
import { app } from "@/app";
import { db } from "@/config/database";
import request from "supertest";

// A patch of the Gulf of Guinea nobody else's fixtures use: 0.001 degrees is about 111 m.
const HERE = { lat: 0.0, lng: 0.0 };
const at = (metersNorth: number) => ({
  latitude: metersNorth / 111_195,
  longitude: 0,
});

describe("GET /search/stores", () => {
  let owner: TestUser;
  let reviewer: TestUser;
  let suspendedOwner: TestUser;

  const search = (query: Record<string, unknown> = {}) =>
    request(app)
      .get("/search/stores")
      .query({ ...HERE, ...query });

  beforeAll(async () => {
    owner = await createTestUser("STORE_OWNER");
    reviewer = await createTestUser("CUSTOMER");
    suspendedOwner = await createTestUser("STORE_OWNER", { suspended: true });
  });

  afterEach(async () => {
    await db.query("DELETE FROM stores WHERE owner_id = ANY($1::uuid[])", [
      [owner.id, suspendedOwner.id],
    ]);
  });

  afterAll(async () => {
    await cleanupFixtures();
    await db.end();
  });

  it("needs no authentication and returns nearest first with distances", async () => {
    await createTestStore(owner.id, "Far Store", at(900));
    await createTestStore(owner.id, "Near Store", at(100));
    await createTestStore(owner.id, "Middle Store", at(400));

    const res = await search();
    expect(res.status).toBe(200);
    expect(res.body.data.map((s: any) => s.name)).toEqual([
      "Near Store",
      "Middle Store",
      "Far Store",
    ]);
    const distances = res.body.data.map((s: any) => s.distance_meters);
    expect(distances[0]).toBeGreaterThan(90);
    expect(distances[0]).toBeLessThan(110);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
  });

  it("returns what a store card needs", async () => {
    const id = await createTestStore(owner.id, "Card Store", {
      ...at(50),
      openingHours: ALWAYS_OPEN,
    });
    const res = await search();
    expect(res.body.data[0]).toEqual({
      id,
      name: "Card Store",
      address: "1 Test Street",
      latitude: expect.any(Number),
      longitude: 0,
      distance_meters: expect.any(Number),
      is_open: true,
      rating: 0,
      review_count: 0,
    });
  });

  it("evaluates Open / Closed in each store's own timezone", async () => {
    await createTestStore(owner.id, "Always Open", {
      ...at(10),
      openingHours: ALWAYS_OPEN,
    });
    await createTestStore(owner.id, "No Hours", { ...at(20) });
    const closedToday = Object.fromEntries(
      Object.keys(ALWAYS_OPEN).map((d) => [
        d,
        { open: "00:00", close: "00:00", closed: true },
      ]),
    );
    await createTestStore(owner.id, "Closed Today", {
      ...at(30),
      openingHours: closedToday,
    });
    await createTestStore(owner.id, "Tokyo Open", {
      ...at(40),
      openingHours: ALWAYS_OPEN,
      timezone: "Asia/Tokyo",
    });

    const byName = Object.fromEntries(
      (await search()).body.data.map((s: any) => [s.name, s.is_open]),
    );
    expect(byName).toEqual({
      "Always Open": true,
      "No Hours": false,
      "Closed Today": false,
      "Tokyo Open": true,
    });
  });

  it("reports the average community rating and review count", async () => {
    const id = await createTestStore(owner.id, "Rated Store", at(10));
    await createTestStore(owner.id, "Unrated Store", at(20));
    const second = await createTestUser("CUSTOMER");
    await db.query(
      "INSERT INTO reviews (user_id, store_id, rating) VALUES ($1, $3, 5), ($2, $3, 4)",
      [reviewer.id, second.id, id],
    );

    const stores = (await search()).body.data;
    expect(stores.find((s: any) => s.name === "Rated Store")).toMatchObject({
      rating: 4.5,
      review_count: 2,
    });
    expect(stores.find((s: any) => s.name === "Unrated Store")).toMatchObject({
      rating: 0,
      review_count: 0,
    });
  });

  it("hides suspended stores and stores whose owner is suspended (SRS 3.2.1)", async () => {
    await createTestStore(owner.id, "Visible Store", at(10));
    await createTestStore(owner.id, "Suspended Store", {
      ...at(20),
      suspended: true,
    });
    await createTestStore(suspendedOwner.id, "Owner Suspended Store", at(30));

    const names = (await search()).body.data.map((s: any) => s.name);
    expect(names).toEqual(["Visible Store"]);
  });

  it("respects the radius, defaulting to 5 km", async () => {
    await createTestStore(owner.id, "Inside 5km", at(4_500));
    await createTestStore(owner.id, "Outside 5km", at(5_500));
    expect((await search()).body.data.map((s: any) => s.name)).toEqual([
      "Inside 5km",
    ]);
    expect((await search({ radius_meters: 10_000 })).body.data).toHaveLength(2);
    expect((await search({ radius_meters: 1_000 })).body.data).toHaveLength(0);
  });

  it("narrows by name, treating wildcard characters literally", async () => {
    await createTestStore(owner.id, "Green Market", at(10));
    await createTestStore(owner.id, "50% Off Shop", at(20));
    await createTestStore(owner.id, "Fifty Shop", at(30));

    expect(
      (await search({ q: "market" })).body.data.map((s: any) => s.name),
    ).toEqual(["Green Market"]);
    expect(
      (await search({ q: "50%" })).body.data.map((s: any) => s.name),
    ).toEqual(["50% Off Shop"]);
    // An unescaped "%" would match every store.
    expect(
      (await search({ q: "%" })).body.data.map((s: any) => s.name),
    ).toEqual(["50% Off Shop"]);
  });

  it("returns an empty list, not an error, when nothing is nearby", async () => {
    const res = await search();
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it.each([
    ["missing coordinates", { lat: undefined, lng: undefined }],
    ["latitude out of range", { lat: 95 }],
    ["longitude out of range", { lng: -181 }],
    ["a non-positive radius", { radius_meters: 0 }],
    ["a very long name filter", { q: "x".repeat(101) }],
  ])("rejects %s", async (_label, query) => {
    const res = await request(app)
      .get("/search/stores")
      .query({ ...HERE, ...query });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });
});
