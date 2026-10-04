import { db } from "@/config/database";
import { generateMockToken } from "@/utils/testAuth";
import type { Express } from "express";
import request from "supertest";

export interface ListTestUser {
  id: string;
  email: string;
  token: string;
}

const users: string[] = [];
const lists: string[] = [];

// Inserts a user with a unique e-mail and a valid access token.
export async function createListUser(
  role: "CUSTOMER" | "STORE_OWNER" = "CUSTOMER",
  fullName = "List Tester",
): Promise<ListTestUser> {
  const email = `lists_${Date.now()}_${Math.random().toString(36).slice(2, 9)}@lists.test`;
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
     VALUES ($1, 'hashed_pwd', $2, $3, NOW()) RETURNING id`,
    [email, fullName, role],
  );
  users.push(rows[0].id);
  return {
    id: rows[0].id,
    email,
    token: generateMockToken({ id: rows[0].id, role }),
  };
}

// Creates a list through the API so the suite exercises the real code path.
export async function createListViaApi(
  app: Express,
  owner: ListTestUser,
  name = "Home",
) {
  const res = await request(app)
    .post("/lists")
    .set("Authorization", `Bearer ${owner.token}`)
    .send({ name });
  if (res.status !== 201)
    throw new Error(
      `createList failed: ${res.status} ${JSON.stringify(res.body)}`,
    );
  lists.push(res.body.id);
  return res.body as {
    id: string;
    invite_code: string;
    name: string;
    role: string;
  };
}

// Adds a member straight in the database (bypasses the join endpoint and its rate limit).
export async function addMemberDirect(
  listId: string,
  userId: string,
  role: "OWNER" | "MEMBER" = "MEMBER",
) {
  await db.query(
    `INSERT INTO household_list_members (list_id, user_id, role) VALUES ($1, $2, $3)`,
    [listId, userId, role],
  );
}

// A real product (needs a store + owner) that can be added to lists.
export async function createCatalogueProduct(name = "Test Milk") {
  const owner = await createListUser("STORE_OWNER", "Shop Owner");
  const store = await db.query(
    `INSERT INTO stores (owner_id, name, address, latitude, longitude, timezone, opening_hours)
     VALUES ($1, 'Lists Fixture Store', '1 Test Street', 35.1, 33.3, 'UTC', '{}') RETURNING id`,
    [owner.id],
  );
  const product = await db.query(
    `INSERT INTO products (store_id, name, price, quantity) VALUES ($1, $2, 2.50, 10) RETURNING id`,
    [store.rows[0].id, name],
  );
  return { id: product.rows[0].id as string, name };
}

export const auth = (user: ListTestUser) => ({
  Authorization: `Bearer ${user.token}`,
});

export function trackList(listId: string) {
  lists.push(listId);
}

// Removes everything the suite created. Lists are deleted explicitly because they don't cascade from users.
export async function cleanupListFixtures() {
  if (lists.length)
    await db.query(`DELETE FROM household_lists WHERE id = ANY($1::uuid[])`, [
      lists.splice(0),
    ]);
  if (users.length)
    await db.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [
      users.splice(0),
    ]);
}
