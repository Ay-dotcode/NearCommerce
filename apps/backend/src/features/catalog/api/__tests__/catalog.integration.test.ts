import {
  TestUser,
  cleanupFixtures,
  createTestCategory,
  createTestProduct,
  createTestStore,
  createTestSubcategory,
  createTestUser,
} from "@/__tests__/helpers/fixtures";
import { app } from "@/app";
import { db } from "@/config/database";
import request from "supertest";

const auth = (u: TestUser) => ({ Authorization: `Bearer ${u.token}` });
const UNKNOWN = "00000000-0000-4000-8000-000000000000";

describe("Categories", () => {
  let admin: TestUser;
  let owner: TestUser;
  let customer: TestUser;
  const auditTargets: string[] = [];
  const tag = `T${Date.now()}`;

  beforeAll(async () => {
    admin = await createTestUser("SYSTEM_ADMIN");
    owner = await createTestUser("STORE_OWNER");
    customer = await createTestUser("CUSTOMER");
  });

  afterAll(async () => {
    await db.query(
      "DELETE FROM admin_audit_logs WHERE target_id = ANY($1::uuid[])",
      [auditTargets],
    );
    await cleanupFixtures();
    await db.end();
  });

  describe("GET /categories (public)", () => {
    it("needs no authentication and nests subcategories alphabetically", async () => {
      const cat = await createTestCategory(`${tag} Zeta`);
      await createTestSubcategory(cat.id, "beta");
      await createTestSubcategory(cat.id, "Alpha");

      const res = await request(app).get("/categories");
      expect(res.status).toBe(200);
      const found = res.body.data.find((c: any) => c.id === cat.id);
      expect(found.subcategories.map((s: any) => s.name)).toEqual([
        "Alpha",
        "beta",
      ]);
    });

    it("counts only what a shopper could buy", async () => {
      const cat = await createTestCategory();
      const sub = await createTestSubcategory(cat.id);
      const goodStore = await createTestStore(owner.id, "Cat Good Store");
      const suspendedOwner = await createTestUser("STORE_OWNER", {
        suspended: true,
      });
      const hiddenStore = await createTestStore(
        suspendedOwner.id,
        "Cat Hidden Store",
      );
      const img = "https://cdn.test/x.jpg";

      await createTestProduct(goodStore, {
        subcategoryId: sub.id,
        isPublished: true,
        imageUrl: img,
        quantity: 4,
      }); // counted
      await createTestProduct(goodStore, {
        subcategoryId: sub.id,
        isPublished: true,
        imageUrl: img,
        quantity: 0,
      }); // out of stock
      await createTestProduct(goodStore, {
        subcategoryId: sub.id,
        isPublished: false,
        quantity: 4,
      }); // draft
      await createTestProduct(hiddenStore, {
        subcategoryId: sub.id,
        isPublished: true,
        imageUrl: img,
        quantity: 4,
      }); // owner suspended

      const res = await request(app).get("/categories");
      const found = res.body.data.find((c: any) => c.id === cat.id);
      expect(found.product_count).toBe(1);
      expect(found.subcategories[0].product_count).toBe(1);
    });
  });

  describe("admin access control", () => {
    it.each([
      ["GET", "/admin/categories"],
      ["POST", "/admin/categories"],
      ["PATCH", `/admin/categories/${UNKNOWN}`],
      ["DELETE", `/admin/categories/${UNKNOWN}`],
      ["POST", `/admin/categories/${UNKNOWN}/subcategories`],
      ["PATCH", `/admin/subcategories/${UNKNOWN}`],
      ["DELETE", `/admin/subcategories/${UNKNOWN}`],
    ])("%s %s requires a token", async (method, path) => {
      const res = await (request(app) as any)
        [method.toLowerCase()](path)
        .send({});
      expect(res.status).toBe(401);
    });

    it.each(["owner", "customer"] as const)(
      "is forbidden for a %s",
      async (who) => {
        const user = who === "owner" ? owner : customer;
        const res = await request(app)
          .post("/admin/categories")
          .set(auth(user))
          .send({ name: `${tag} nope` });
        expect(res.status).toBe(403);
        const exists = await db.query(
          "SELECT 1 FROM categories WHERE name = $1",
          [`${tag} nope`],
        );
        expect(exists.rowCount).toBe(0);
      },
    );
  });

  describe("category CRUD", () => {
    it("creates, trims and lists a category", async () => {
      const res = await request(app)
        .post("/admin/categories")
        .set(auth(admin))
        .send({
          name: `  ${tag} Dairy  `,
          iconUrl: "https://cdn.test/dairy.png",
        });
      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        name: `${tag} Dairy`,
        icon_url: "https://cdn.test/dairy.png",
        subcategories: [],
      });

      const list = await request(app).get("/admin/categories").set(auth(admin));
      expect(list.body.data.some((c: any) => c.id === res.body.data.id)).toBe(
        true,
      );
      await db.query("DELETE FROM categories WHERE id = $1", [
        res.body.data.id,
      ]);
    });

    it("rejects an empty name, an over-long name and a non-http icon", async () => {
      const res = await request(app)
        .post("/admin/categories")
        .set(auth(admin))
        .send({ name: "   ", iconUrl: "javascript:alert(1)" });
      expect(res.status).toBe(400);
      const paths = res.body.details.map((d: any) => d.path);
      expect(paths).toEqual(expect.arrayContaining(["name", "iconUrl"]));

      const long = await request(app)
        .post("/admin/categories")
        .set(auth(admin))
        .send({ name: "x".repeat(101) });
      expect(long.status).toBe(400);
    });

    it("rejects a duplicate name regardless of letter case", async () => {
      const cat = await createTestCategory(`${tag} Bakery`);
      const res = await request(app)
        .post("/admin/categories")
        .set(auth(admin))
        .send({ name: cat.name.toUpperCase() });
      expect(res.status).toBe(409);
      expect(res.body.details[0].path).toBe("name");
    });

    it("renames, changes and clears the icon", async () => {
      const cat = await createTestCategory();
      const renamed = await request(app)
        .patch(`/admin/categories/${cat.id}`)
        .set(auth(admin))
        .send({ name: `${tag} Renamed`, iconUrl: "https://cdn.test/i.png" });
      expect(renamed.status).toBe(200);
      expect(renamed.body.data).toMatchObject({
        name: `${tag} Renamed`,
        icon_url: "https://cdn.test/i.png",
      });

      const cleared = await request(app)
        .patch(`/admin/categories/${cat.id}`)
        .set(auth(admin))
        .send({ iconUrl: null });
      expect(cleared.body.data.icon_url).toBeNull();
      expect(cleared.body.data.name).toBe(`${tag} Renamed`);
    });

    it("rejects empty updates, unknown ids and clashing names", async () => {
      const a = await createTestCategory();
      const b = await createTestCategory();
      expect(
        (
          await request(app)
            .patch(`/admin/categories/${a.id}`)
            .set(auth(admin))
            .send({})
        ).status,
      ).toBe(400);
      expect(
        (
          await request(app)
            .patch(`/admin/categories/${UNKNOWN}`)
            .set(auth(admin))
            .send({ name: "x" })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app)
            .patch(`/admin/categories/not-a-uuid`)
            .set(auth(admin))
            .send({ name: "x" })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app)
            .patch(`/admin/categories/${a.id}`)
            .set(auth(admin))
            .send({ name: b.name })
        ).status,
      ).toBe(409);
    });
  });

  describe("subcategory CRUD", () => {
    it("creates a subcategory and rejects a duplicate within the same category only", async () => {
      const one = await createTestCategory();
      const two = await createTestCategory();
      const first = await request(app)
        .post(`/admin/categories/${one.id}/subcategories`)
        .set(auth(admin))
        .send({ name: "Milk" });
      expect(first.status).toBe(201);
      expect(first.body.data).toMatchObject({
        name: "Milk",
        parent_category_id: one.id,
      });

      const dup = await request(app)
        .post(`/admin/categories/${one.id}/subcategories`)
        .set(auth(admin))
        .send({ name: "milk" });
      expect(dup.status).toBe(409);

      const other = await request(app)
        .post(`/admin/categories/${two.id}/subcategories`)
        .set(auth(admin))
        .send({ name: "Milk" });
      expect(other.status).toBe(201); // same name is fine under another category
    });

    it("404s for a missing parent and validates the name", async () => {
      expect(
        (
          await request(app)
            .post(`/admin/categories/${UNKNOWN}/subcategories`)
            .set(auth(admin))
            .send({ name: "x" })
        ).status,
      ).toBe(404);
      const cat = await createTestCategory();
      expect(
        (
          await request(app)
            .post(`/admin/categories/${cat.id}/subcategories`)
            .set(auth(admin))
            .send({ name: "" })
        ).status,
      ).toBe(400);
    });

    it("renames a subcategory and rejects clashes and unknown ids", async () => {
      const cat = await createTestCategory();
      const a = await createTestSubcategory(cat.id, "Cheese");
      await createTestSubcategory(cat.id, "Yogurt");
      const ok = await request(app)
        .patch(`/admin/subcategories/${a.id}`)
        .set(auth(admin))
        .send({ name: "Cheeses" });
      expect(ok.body.data.name).toBe("Cheeses");
      expect(
        (
          await request(app)
            .patch(`/admin/subcategories/${a.id}`)
            .set(auth(admin))
            .send({ name: "yogurt" })
        ).status,
      ).toBe(409);
      expect(
        (
          await request(app)
            .patch(`/admin/subcategories/${UNKNOWN}`)
            .set(auth(admin))
            .send({ name: "z" })
        ).status,
      ).toBe(404);
    });
  });

  describe("deletion", () => {
    it("requires a reason", async () => {
      const cat = await createTestCategory();
      const res = await request(app)
        .delete(`/admin/categories/${cat.id}`)
        .set(auth(admin))
        .send({});
      expect(res.status).toBe(400);
      expect(
        (await db.query("SELECT 1 FROM categories WHERE id = $1", [cat.id]))
          .rowCount,
      ).toBe(1);
    });

    it("deletes a subcategory, keeps its products uncategorised, and writes an audit snapshot", async () => {
      const cat = await createTestCategory();
      const sub = await createTestSubcategory(cat.id, "Doomed");
      const store = await createTestStore(owner.id, "Del Sub Store");
      const productId = await createTestProduct(store, {
        subcategoryId: sub.id,
      });
      auditTargets.push(sub.id);

      const res = await request(app)
        .delete(`/admin/subcategories/${sub.id}`)
        .set(auth(admin))
        .send({ reason: "Merged into another subcategory" });
      expect(res.status).toBe(200);
      expect(res.body.affected_products).toBe(1);

      expect(
        (
          await db.query("SELECT subcategory_id FROM products WHERE id = $1", [
            productId,
          ])
        ).rows[0].subcategory_id,
      ).toBeNull();
      const audit = await db.query(
        "SELECT * FROM admin_audit_logs WHERE target_id = $1",
        [sub.id],
      );
      expect(audit.rows[0]).toMatchObject({
        action: "DELETE_SUBCATEGORY",
        target_type: "SUBCATEGORY",
        admin_id: admin.id,
      });
      expect(audit.rows[0].snapshot.subcategory.name).toBe("Doomed");
    });

    it("deletes a category with its subcategories and records everything it removed", async () => {
      const cat = await createTestCategory(`${tag} Gone`);
      const s1 = await createTestSubcategory(cat.id, "One");
      await createTestSubcategory(cat.id, "Two");
      const store = await createTestStore(owner.id, "Del Cat Store");
      await createTestProduct(store, { subcategoryId: s1.id });
      auditTargets.push(cat.id);

      const res = await request(app)
        .delete(`/admin/categories/${cat.id}`)
        .set(auth(admin))
        .send({ reason: "Retired category" });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        affected_products: 1,
        deleted_subcategories: 2,
      });

      expect(
        (await db.query("SELECT 1 FROM categories WHERE id = $1", [cat.id]))
          .rowCount,
      ).toBe(0);
      expect(
        (
          await db.query(
            "SELECT 1 FROM subcategories WHERE parent_category_id = $1",
            [cat.id],
          )
        ).rowCount,
      ).toBe(0);
      const audit = await db.query(
        "SELECT snapshot FROM admin_audit_logs WHERE target_id = $1",
        [cat.id],
      );
      expect(audit.rows[0].snapshot.category.name).toBe(`${tag} Gone`);
      expect(audit.rows[0].snapshot.subcategories).toHaveLength(2);
    });

    it("404s for unknown ids without writing an audit row", async () => {
      const before = await db.query(
        "SELECT COUNT(*)::int n FROM admin_audit_logs",
      );
      const res = await request(app)
        .delete(`/admin/categories/${UNKNOWN}`)
        .set(auth(admin))
        .send({ reason: "Cleanup attempt" });
      expect(res.status).toBe(404);
      expect(
        (
          await request(app)
            .delete(`/admin/subcategories/${UNKNOWN}`)
            .set(auth(admin))
            .send({ reason: "Cleanup attempt" })
        ).status,
      ).toBe(404);
      const after = await db.query(
        "SELECT COUNT(*)::int n FROM admin_audit_logs",
      );
      expect(after.rows[0].n).toBe(before.rows[0].n);
    });

    it("admin tree counts every assigned product, including drafts", async () => {
      const cat = await createTestCategory();
      const sub = await createTestSubcategory(cat.id);
      const store = await createTestStore(owner.id, "Admin Count Store");
      await createTestProduct(store, {
        subcategoryId: sub.id,
        isPublished: false,
      });
      const res = await request(app).get("/admin/categories").set(auth(admin));
      expect(
        res.body.data.find((c: any) => c.id === cat.id).product_count,
      ).toBe(1);
    });
  });

  describe("product assignment", () => {
    it("owners can assign a subcategory to a product and shoppers can filter by it", async () => {
      const cat = await createTestCategory();
      const sub = await createTestSubcategory(cat.id);
      const store = await createTestStore(owner.id, "Assign Store");
      const res = await request(app)
        .post(`/stores/${store}/products`)
        .set(auth(owner))
        .set("x-store-id", store)
        .send({
          name: "Assigned item",
          price: 3,
          quantity: 2,
          subcategoryId: sub.id,
        });
      expect(res.status).toBe(201);
      expect(res.body.data.subcategory_id).toBe(sub.id);
    });

    it("rejects a subcategory that does not exist", async () => {
      const store = await createTestStore(owner.id, "Assign Bad Store");
      const res = await request(app)
        .post(`/stores/${store}/products`)
        .set(auth(owner))
        .set("x-store-id", store)
        .send({
          name: "Bad assignment",
          price: 3,
          quantity: 2,
          subcategoryId: UNKNOWN,
        });
      expect(res.status).toBe(422);
    });
  });
});
