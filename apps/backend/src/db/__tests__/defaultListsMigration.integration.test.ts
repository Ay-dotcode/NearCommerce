import { db } from "@/config/database";
import fs from "fs";
import path from "path";

const sql = fs.readFileSync(
  path.join(__dirname, "../migrations/008_default_shopper_lists.sql"),
  "utf8",
);
const PREFIX = "default-lists-migration";
const email = (n: string) => `${PREFIX}-${n}@example.com`;

const addUser = async (n: string, fullName: string, role = "CUSTOMER") =>
  (
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, email_verified_at)
       VALUES ($1, 'x', $2, $3, NOW()) RETURNING id`,
      [email(n), fullName, role],
    )
  ).rows[0].id as string;

const listsOf = async (userId: string) =>
  (
    await db.query(
      `SELECT l.name, m.role
         FROM household_list_members m JOIN household_lists l ON l.id = m.list_id
        WHERE m.user_id = $1 ORDER BY l.name`,
      [userId],
    )
  ).rows;

async function cleanup() {
  await db.query(
    `DELETE FROM household_lists WHERE id IN (
       SELECT m.list_id FROM household_list_members m
         JOIN users u ON u.id = m.user_id WHERE u.email LIKE $1)`,
    [`${PREFIX}%`],
  );
  await db.query("DELETE FROM users WHERE email LIKE $1", [`${PREFIX}%`]);
}

describe("migration 008: a starting list for existing shoppers", () => {
  beforeEach(cleanup);
  afterAll(async () => {
    await cleanup();
    await db.end();
  });

  it("gives a shopper with no list one, named after their first name, as its owner", async () => {
    const ada = await addUser("ada", "Ada Lovelace");
    const solo = await addUser("solo", "   ");

    await db.query(sql);

    expect(await listsOf(ada)).toEqual([{ name: "Ada's list", role: "OWNER" }]);
    expect(await listsOf(solo)).toEqual([{ name: "My list", role: "OWNER" }]);
  });

  it("leaves shoppers who are already in a list, and store owners, alone", async () => {
    const member = await addUser("member", "Grace Hopper");
    const owner = await addUser("owner", "Sam Seller", "STORE_OWNER");
    const list = (
      await db.query(
        `INSERT INTO household_lists (name, invite_code) VALUES ('Household', 'MIGTEST1') RETURNING id`,
      )
    ).rows[0].id;
    await db.query(
      `INSERT INTO household_list_members (list_id, user_id, role) VALUES ($1, $2, 'MEMBER')`,
      [list, member],
    );

    await db.query(sql);

    expect(await listsOf(member)).toEqual([
      { name: "Household", role: "MEMBER" },
    ]);
    expect(await listsOf(owner)).toEqual([]);
  });

  it("is safe to run again: nobody gets a second list", async () => {
    const ada = await addUser("again", "Ada Lovelace");
    await db.query(sql);
    await db.query(sql);
    expect(await listsOf(ada)).toHaveLength(1);
  });

  it("makes invite codes that the join screen accepts", async () => {
    const ada = await addUser("code", "Ada Lovelace");
    await db.query(sql);
    const { rows } = await db.query(
      `SELECT l.invite_code FROM household_lists l
         JOIN household_list_members m ON m.list_id = l.id WHERE m.user_id = $1`,
      [ada],
    );
    expect(rows[0].invite_code).toMatch(/^[A-Z0-9]{4,10}$/);
  });
});
