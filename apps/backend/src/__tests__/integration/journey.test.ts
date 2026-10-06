import { ALWAYS_OPEN } from "@/__tests__/helpers/fixtures";
import { app } from "@/app";
import { db } from "@/config/database";
import bcrypt from "bcrypt";
import request from "supertest";

// One pass through the whole product, using only the public API apart from
// seeding the two admin accounts: onboarding, catalog, browsing, favorites,
// reviews, household lists and admin controls, with a token refresh in the
// middle. It exists to catch seams between features that unit tests miss.
const RUN = `${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
const PASSWORD = "journeyPass123";
const email = (who: string) => `${who}_${RUN}@journey.test`;

type Session = { access: string; refresh: string; id: string };
const auth = (s: Session) => ({ Authorization: `Bearer ${s.access}` });

async function register(who: string, role?: "STORE_OWNER") {
  const res = await request(app)
    .post("/auth/register")
    .send({
      email: email(who),
      password: PASSWORD,
      full_name: `${who} Tester`,
      ...(role && { role }),
    });
  expect(res.status).toBe(201);
}

async function login(who: string): Promise<Session> {
  const res = await request(app)
    .post("/auth/login")
    .send({ email: email(who), password: PASSWORD });
  expect(res.status).toBe(200);
  return {
    access: res.body.access_token,
    refresh: res.body.refresh_token,
    id: res.body.user.id,
  };
}

async function seedAdmin(who: string) {
  await db.query(
    `INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
     VALUES ($1, $2, $3, 'SYSTEM_ADMIN', NOW())`,
    [email(who), await bcrypt.hash(PASSWORD, 4), `${who} Admin`],
  );
}

describe("user journey", () => {
  let admin: Session;
  let owner: Session;
  let shopper: Session;
  let friend: Session;
  let categoryId: string;
  let subcategoryId: string;
  let storeId: string;
  let productId: string;

  beforeAll(async () => {
    await seedAdmin("admin1");
    await seedAdmin("admin2");
  });

  afterAll(async () => {
    await db.query(`DELETE FROM users WHERE email LIKE $1`, [
      `%\\_${RUN}@journey.test`,
    ]);
    if (categoryId)
      await db.query(`DELETE FROM categories WHERE id = $1`, [categoryId]);
    await db.end();
  });

  it("admin builds the catalog", async () => {
    admin = await login("admin1");
    const cat = await request(app)
      .post("/admin/categories")
      .set(auth(admin))
      .send({ name: `Journey Groceries ${RUN}` });
    expect(cat.status).toBe(201);
    categoryId = cat.body.data?.id ?? cat.body.id;
    expect(categoryId).toBeTruthy();

    const sub = await request(app)
      .post(`/admin/categories/${categoryId}/subcategories`)
      .set(auth(admin))
      .send({ name: `Dairy ${RUN}` });
    expect(sub.status).toBe(201);
    subcategoryId = sub.body.data?.id ?? sub.body.id;
  });

  it("a store owner signs up, opens a store and lists a product", async () => {
    await register("owner", "STORE_OWNER");
    owner = await login("owner");

    const store = await request(app).post("/stores").set(auth(owner)).send({
      name: "Journey Market",
      address: "12 Main Street, Nicosia",
      latitude: 35.17,
      longitude: 33.36,
      timezone: "UTC",
      openingHours: ALWAYS_OPEN,
    });
    expect(store.status).toBe(201);
    storeId = store.body.data?.id ?? store.body.id;

    const product = await request(app)
      .post(`/stores/${storeId}/products`)
      .set(auth(owner))
      .set("X-Store-ID", storeId)
      .send({
        name: `Journey Milk ${RUN}`,
        price: 2.5,
        quantity: 8,
        imageUrl: "https://example.com/milk.png",
        isPublished: true,
        subcategoryId,
      });
    expect(product.status).toBe(201);
    productId = product.body.data?.id ?? product.body.id;

    const mine = await request(app).get("/stores/mine").set(auth(owner));
    expect(mine.status).toBe(200);
    expect(JSON.stringify(mine.body)).toContain(storeId);
  });

  it("a shopper browses by category and finds the store", async () => {
    await register("shopper");
    shopper = await login("shopper");

    const tree = await request(app).get("/categories");
    const category = tree.body.data.find((c: any) => c.id === categoryId);
    expect(category.subcategories.map((s: any) => s.id)).toContain(
      subcategoryId,
    );

    const near = { lat: 35.17, lng: 33.36 };
    const byCategory = await request(app)
      .get("/search")
      .query({ ...near, category_id: categoryId })
      .set(auth(shopper));
    expect(byCategory.body.data.map((p: any) => p.id)).toContain(productId);

    const bySub = await request(app)
      .get("/search")
      .query({ ...near, subcategory_id: subcategoryId });
    expect(bySub.body.data.map((p: any) => p.id)).toContain(productId);

    const stores = await request(app).get("/search/stores").query(near);
    expect(stores.body.data.map((s: any) => s.id)).toContain(storeId);

    const detail = await request(app).get(`/stores/${storeId}`);
    expect(detail.body.data.isOpen).toBe(true);
    expect(detail.body.data.products[0]).toMatchObject({
      id: productId,
      in_stock: true,
    });
  });

  it("the shopper's session survives a token refresh", async () => {
    const oldRefresh = shopper.refresh;
    const res = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: oldRefresh });
    expect(res.status).toBe(200);
    shopper = {
      ...shopper,
      access: res.body.access_token,
      refresh: res.body.refresh_token,
    };

    const replay = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: oldRefresh });
    expect(replay.status).toBe(401);
    const stillIn = await request(app).get("/favorites").set(auth(shopper));
    expect(stillIn.status).toBe(200);
  });

  it("favorites: add, list with details, remove", async () => {
    const store = await request(app)
      .post("/favorites")
      .set(auth(shopper))
      .send({ store_id: storeId });
    expect(store.status).toBe(201);
    const product = await request(app)
      .post("/favorites")
      .set(auth(shopper))
      .send({ product_id: productId });
    expect(product.status).toBe(201);

    const list = await request(app).get("/favorites").set(auth(shopper));
    const types = list.body.data.map((f: any) => f.type).sort();
    expect(types).toEqual(["product", "store"]);
    expect(list.body.data.find((f: any) => f.type === "store").store.name).toBe(
      "Journey Market",
    );

    const removed = await request(app)
      .delete(`/favorites/${store.body.data.id}`)
      .set(auth(shopper));
    expect(removed.status).toBe(204);
    const again = await request(app)
      .delete(`/favorites/${store.body.data.id}`)
      .set(auth(shopper));
    expect(again.status).toBe(404);
  });

  it("reviews: write, list, edit, average follows, delete", async () => {
    const created = await request(app)
      .post("/reviews")
      .set(auth(shopper))
      .send({ productId, rating: 5, comment: "Fresh" });
    expect(created.status).toBe(201);
    const reviewId = created.body.data.id;

    const duplicate = await request(app)
      .post("/reviews")
      .set(auth(shopper))
      .send({ productId, rating: 1 });
    expect(duplicate.status).toBe(409);

    const publicList = await request(app)
      .get("/reviews")
      .query({ product_id: productId })
      .set(auth(shopper));
    expect(publicList.body.summary).toMatchObject({
      rating: 5,
      review_count: 1,
    });
    expect(publicList.body.data[0]).toMatchObject({
      is_mine: true,
      reviewer_name: "shopper T.",
    });
    const anonymous = await request(app)
      .get("/reviews")
      .query({ product_id: productId });
    expect(anonymous.body.data[0].is_mine).toBe(false);

    const edited = await request(app)
      .patch(`/reviews/${reviewId}`)
      .set(auth(shopper))
      .send({ rating: 3, comment: "Okay" });
    expect(edited.status).toBe(200);
    const detail = await request(app).get(`/products/${productId}`);
    expect(detail.body.rating).toBe(3);

    const strangerDelete = await request(app)
      .delete(`/reviews/${reviewId}`)
      .set(auth(owner));
    expect(strangerDelete.status).toBe(404);

    const deleted = await request(app)
      .delete(`/reviews/${reviewId}`)
      .set(auth(shopper));
    expect(deleted.status).toBe(204);
    const after = await request(app)
      .get("/reviews")
      .query({ product_id: productId });
    expect(after.body.summary.review_count).toBe(0);
  });

  it("household list: share, add twice, tick off, leave", async () => {
    await register("friend");
    friend = await login("friend");

    const list = await request(app)
      .post("/lists")
      .set(auth(shopper))
      .send({ name: "Weekly shop" });
    expect(list.status).toBe(201);

    const join = await request(app)
      .post("/lists/join")
      .set(auth(friend))
      .send({ invite_code: list.body.invite_code });
    expect(join.status).toBe(201);

    const first = await request(app)
      .post(`/lists/${list.body.id}/items`)
      .set(auth(shopper))
      .send({ product_id: productId });
    expect(first.body.already_on_list).toBe(false);
    const second = await request(app)
      .post(`/lists/${list.body.id}/items`)
      .set(auth(friend))
      .send({ product_id: productId });
    expect(second.body).toMatchObject({ already_on_list: true, quantity: 2 });

    const ticked = await request(app)
      .patch(`/lists/${list.body.id}/items/${first.body.id}`)
      .set(auth(friend))
      .send({ is_checked: true });
    expect(ticked.status).toBe(200);

    const detail = await request(app)
      .get(`/lists/${list.body.id}`)
      .set(auth(shopper));
    expect(detail.body.viewer_id).toBe(shopper.id);
    expect(detail.body.members).toHaveLength(2);
    expect(detail.body.items[0]).toMatchObject({
      quantity: 2,
      is_checked: true,
    });

    const left = await request(app)
      .post(`/lists/${list.body.id}/leave`)
      .set(auth(friend));
    expect(left.status).toBe(200);
    const gone = await request(app)
      .get(`/lists/${list.body.id}`)
      .set(auth(friend));
    expect(gone.status).toBe(404);
  });

  it("admin demotion locks the other admin out at once", async () => {
    const second = await login("admin2");
    const before = await request(app).get("/admin/metrics").set(auth(second));
    expect(before.status).toBe(200);

    const demoted = await request(app)
      .patch(`/admin/users/${second.id}/demote`)
      .set(auth(admin))
      .send({ reason: "Journey test demotion" });
    expect(demoted.status).toBe(200);

    // Same access token, still unexpired, but the role is re-read.
    const after = await request(app).get("/admin/metrics").set(auth(second));
    expect(after.status).toBe(403);
    const refresh = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: second.refresh });
    expect(refresh.status).toBe(401);
  });

  it("signing out ends the session", async () => {
    const out = await request(app)
      .post("/auth/logout")
      .send({ refresh_token: shopper.refresh });
    expect(out.status).toBe(204);
    const refresh = await request(app)
      .post("/auth/refresh")
      .send({ refresh_token: shopper.refresh });
    expect(refresh.status).toBe(401);
  });
});
