import { db } from "@/config/database";
import { generateMockToken } from "@/utils/testAuth";

export interface TestUser {
  id: string;
  token: string;
  email: string;
}

const created: string[] = [];

// Inserts a user with a unique e-mail and returns it with a valid access token.
export async function createTestUser(
  role: "CUSTOMER" | "STORE_OWNER" | "SYSTEM_ADMIN",
  { suspended = false }: { suspended?: boolean } = {},
): Promise<TestUser> {
  const email = `${role.toLowerCase()}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@fixtures.test`;
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role, email_verified_at, is_suspended)
     VALUES ($1, 'hashed_pwd', 'Fixture User', $2, NOW(), $3) RETURNING id`,
    [email, role, suspended],
  );
  created.push(rows[0].id);
  return {
    id: rows[0].id,
    email,
    token: generateMockToken({ id: rows[0].id, role }),
  };
}

export const ALWAYS_OPEN = Object.fromEntries(
  [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ].map((day) => [day, { open: "00:00", close: "23:59" }]),
);

export async function createTestStore(
  ownerId: string,
  name = "Fixture Store",
  options: {
    latitude?: number;
    longitude?: number;
    suspended?: boolean;
    openingHours?: Record<string, unknown>;
    timezone?: string;
  } = {},
) {
  const { rows } = await db.query(
    `INSERT INTO stores (owner_id, name, address, latitude, longitude, timezone, opening_hours, is_suspended)
     VALUES ($1, $2, '1 Test Street', $3, $4, $5, $6, $7) RETURNING id`,
    [
      ownerId,
      name,
      options.latitude ?? 35.17,
      options.longitude ?? 33.36,
      options.timezone ?? "UTC",
      JSON.stringify(options.openingHours ?? {}),
      options.suspended ?? false,
    ],
  );
  return rows[0].id as string;
}

const createdCategories: string[] = [];

// Inserts a category (unique name unless given). Removed again by cleanupFixtures.
export async function createTestCategory(name?: string) {
  const unique =
    name ?? `Cat ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await db.query(
    "INSERT INTO categories (name) VALUES ($1) RETURNING id, name",
    [unique],
  );
  createdCategories.push(rows[0].id);
  return rows[0] as { id: string; name: string };
}

export async function createTestSubcategory(categoryId: string, name?: string) {
  const unique =
    name ?? `Sub ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const { rows } = await db.query(
    "INSERT INTO subcategories (parent_category_id, name) VALUES ($1, $2) RETURNING id, name",
    [categoryId, unique],
  );
  return rows[0] as { id: string; name: string };
}

export async function createTestProduct(
  storeId: string,
  overrides: Partial<{
    name: string;
    price: number;
    quantity: number;
    imageUrl: string | null;
    isPublished: boolean;
    description: string | null;
    verifiedDaysAgo: number;
    subcategoryId: string | null;
  }> = {},
) {
  const o = {
    name: "Fixture Product",
    price: 5,
    quantity: 3,
    imageUrl: null,
    isPublished: false,
    description: null,
    verifiedDaysAgo: 0,
    subcategoryId: null,
    ...overrides,
  };
  const { rows } = await db.query(
    `INSERT INTO products (store_id, name, description, price, quantity, image_url, is_published, last_verified_at, subcategory_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - ($8 || ' days')::interval, $9) RETURNING id`,
    [
      storeId,
      o.name,
      o.description,
      o.price,
      o.quantity,
      o.imageUrl,
      o.isPublished,
      String(o.verifiedDaysAgo),
      o.subcategoryId,
    ],
  );
  return rows[0].id as string;
}

// Deletes every user created through this helper (stores/products cascade).
export async function cleanupFixtures() {
  if (created.length)
    await db.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [
      created.splice(0),
    ]);
  // Subcategories cascade; products keep existing but lose their subcategory.
  if (createdCategories.length)
    await db.query(`DELETE FROM categories WHERE id = ANY($1::uuid[])`, [
      createdCategories.splice(0),
    ]);
}

export const OPEN_WEEK = {
  monday: { open: "09:00", close: "18:00" },
  sunday: { open: "00:00", close: "00:00", closed: true },
};
