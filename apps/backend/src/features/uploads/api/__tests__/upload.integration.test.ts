import {
  cleanupFixtures,
  createTestProduct,
  createTestStore,
  createTestUser,
  TestUser,
} from "@/__tests__/helpers/fixtures";
import { app } from "@/app";
import { db } from "@/config/database";
import {
  MAX_UPLOAD_IMAGE_BYTES,
  UNUSED_IMAGE_GRACE_MINUTES,
} from "@/constants";
import { pruneUnusedImages } from "@/features/uploads/services/image.service";
import request from "supertest";

jest.mock("@/config/redis", () => ({
  __esModule: true,
  default: { del: jest.fn(), get: jest.fn(), setEx: jest.fn(), isOpen: true },
  connectRedis: jest.fn(),
}));
jest.setTimeout(30000);

// Just enough of each format for the magic-byte check.
const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from("fake jpeg body"),
]);
const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from("fake png body"),
]);
const WEBP = Buffer.concat([
  Buffer.from("RIFF"),
  Buffer.from([0x10, 0, 0, 0]),
  Buffer.from("WEBPVP8 "),
]);

describe("Product image upload and hosting", () => {
  let owner: TestUser;
  let otherOwner: TestUser;
  let customer: TestUser;
  const auth = (u: TestUser) => `Bearer ${u.token}`;
  const upload = (u: TestUser, body: Buffer, type = "image/jpeg") =>
    request(app)
      .post("/api/uploads/images")
      .set("Authorization", auth(u))
      .set("Content-Type", type)
      .send(body);

  beforeAll(async () => {
    owner = await createTestUser("STORE_OWNER");
    otherOwner = await createTestUser("STORE_OWNER");
    customer = await createTestUser("CUSTOMER");
  });

  afterAll(async () => {
    await cleanupFixtures();
    await db.end();
  });

  it("stores an image and returns an absolute URL that serves it back", async () => {
    const res = await upload(owner, JPEG);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      content_type: "image/jpeg",
      bytes: JPEG.length,
    });
    expect(res.body.url).toMatch(
      new RegExp(`^http://127\\.0\\.0\\.1:\\d+/api/images/${res.body.id}$`),
    );

    // Public: no auth needed, and the exact bytes come back with safe, cacheable headers.
    const path = new URL(res.body.url).pathname;
    const served = await request(app)
      .get(path)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(served.status).toBe(200);
    expect(served.headers["content-type"]).toBe("image/jpeg");
    expect(served.headers["cache-control"]).toMatch(/immutable/);
    expect(served.headers["x-content-type-options"]).toBe("nosniff");
    expect(served.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(Buffer.compare(served.body, JPEG)).toBe(0);
  });

  it("accepts PNG and WebP", async () => {
    expect((await upload(owner, PNG, "image/png")).status).toBe(201);
    expect((await upload(owner, WEBP, "image/webp")).status).toBe(201);
  });

  it("uses PUBLIC_API_URL for the returned URL when set", async () => {
    process.env.PUBLIC_API_URL = "https://api.nearcommerce.test/";
    try {
      const res = await upload(owner, JPEG);
      expect(res.body.url).toBe(
        `https://api.nearcommerce.test/api/images/${res.body.id}`,
      );
    } finally {
      delete process.env.PUBLIC_API_URL;
    }
  });

  it("is limited to authenticated store owners", async () => {
    const anonymous = await request(app)
      .post("/api/uploads/images")
      .set("Content-Type", "image/jpeg")
      .send(JPEG);
    expect(anonymous.status).toBe(401);
    expect((await upload(customer, JPEG)).status).toBe(403);
  });

  it("rejects files whose bytes do not match the declared type", async () => {
    const lie = await upload(owner, Buffer.from("<script>alert(1)</script>"));
    expect(lie.status).toBe(415);
    const mislabelled = await upload(owner, PNG, "image/jpeg");
    expect(mislabelled.status).toBe(415);
  });

  it("rejects other content types and empty bodies", async () => {
    expect((await upload(owner, JPEG, "text/plain")).status).toBe(415);
    expect((await upload(owner, Buffer.alloc(0))).status).toBe(400);
  });

  it("rejects images over the size limit with a 413", async () => {
    const big = Buffer.concat([JPEG, Buffer.alloc(MAX_UPLOAD_IMAGE_BYTES)]);
    const res = await upload(owner, big);
    expect(res.status).toBe(413);
    expect(res.body.error).toMatch(/at most 2 MB/);
  });

  it("404s for unknown or malformed image ids", async () => {
    expect(
      (
        await request(app).get(
          "/api/images/00000000-0000-0000-0000-000000000000",
        )
      ).status,
    ).toBe(404);
    expect((await request(app).get("/api/images/not-a-uuid")).status).toBe(404);
  });

  describe("pruning unused uploads", () => {
    const ageImage = (id: string, minutes: number) =>
      db.query(
        `UPDATE uploaded_images SET created_at = NOW() - make_interval(mins => $2) WHERE id = $1`,
        [id, minutes],
      );
    const exists = async (id: string) =>
      (await db.query(`SELECT 1 FROM uploaded_images WHERE id = $1`, [id]))
        .rowCount === 1;

    it("deletes old unreferenced images but keeps used and recent ones", async () => {
      const store = await createTestStore(otherOwner.id, "Prune Store");
      const used = (await upload(otherOwner, JPEG)).body;
      const abandoned = (await upload(otherOwner, JPEG)).body;
      const recent = (await upload(otherOwner, JPEG)).body;
      await createTestProduct(store, {
        name: "With image",
        imageUrl: used.url,
        isPublished: true,
      });
      const old = UNUSED_IMAGE_GRACE_MINUTES + 5;
      await ageImage(used.id, old);
      await ageImage(abandoned.id, old);

      await pruneUnusedImages(otherOwner.id);

      expect(await exists(used.id)).toBe(true);
      expect(await exists(recent.id)).toBe(true);
      expect(await exists(abandoned.id)).toBe(false);
    });

    it("never touches another owner's uploads", async () => {
      const mine = (await upload(owner, JPEG)).body;
      await ageImage(mine.id, UNUSED_IMAGE_GRACE_MINUTES + 5);
      await pruneUnusedImages(otherOwner.id);
      expect(await exists(mine.id)).toBe(true);
    });
  });

  it("removes a user's images when the account is deleted", async () => {
    const temp = await createTestUser("STORE_OWNER");
    const { body } = await upload(temp, JPEG);
    await db.query(`DELETE FROM users WHERE id = $1`, [temp.id]);
    expect((await request(app).get(`/api/images/${body.id}`)).status).toBe(404);
  });
});
