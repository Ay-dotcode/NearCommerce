// The socket layer is stubbed so we can assert exactly which realtime events each action emits.
// (Real socket behaviour is covered in list.socket.integration.test.ts.)
const mockEmitted: { room: string; event: string; payload: any }[] = [];
const mockLeft: { fromRoom: string; room: string }[] = [];
jest.mock("@/config/socket", () => ({
  getIO: () => ({
    to: (room: string) => ({
      emit: (event: string, payload: unknown) =>
        mockEmitted.push({ room, event, payload }),
    }),
    in: (fromRoom: string) => ({
      socketsLeave: (room: string) => mockLeft.push({ fromRoom, room }),
    }),
  }),
}));

import { app } from "@/app";
import { db } from "@/config/database";
import { MAX_LIST_ITEMS, MAX_LIST_MEMBERS } from "@/constants";
import request from "supertest";
import {
  addMemberDirect,
  auth,
  cleanupListFixtures,
  createCatalogueProduct,
  createListUser,
  createListViaApi,
  ListTestUser,
} from "./listFixtures";

const eventsOf = (name: string) => mockEmitted.filter((e) => e.event === name);

describe("Household lists REST API", () => {
  let owner: ListTestUser;
  let member: ListTestUser;
  let stranger: ListTestUser;
  let milk: { id: string; name: string };

  beforeAll(async () => {
    owner = await createListUser("CUSTOMER", "Olu Owner");
    member = await createListUser("CUSTOMER", "Mia Member");
    stranger = await createListUser("CUSTOMER", "Sam Stranger");
    milk = await createCatalogueProduct("Test Milk");
  });

  beforeEach(() => {
    mockEmitted.length = 0;
    mockLeft.length = 0;
  });

  // Every test builds its own lists. Clearing them keeps the shared users under MAX_LISTS_PER_USER.
  afterEach(async () => {
    await db.query(
      `DELETE FROM household_lists WHERE id IN
         (SELECT list_id FROM household_list_members WHERE user_id = ANY($1::uuid[]))`,
      [[owner.id, member.id, stranger.id]],
    );
  });

  afterAll(async () => {
    await cleanupListFixtures();
    await db.end();
  });

  describe("authentication", () => {
    it.each([
      ["get", "/lists"],
      ["post", "/lists"],
      ["post", "/lists/join"],
      ["get", "/lists/my-list"],
      ["get", "/lists/00000000-0000-4000-8000-000000000000"],
    ])("%s %s requires a token", async (method, path) => {
      const res = await (request(app) as any)[method](path);
      expect(res.status).toBe(401);
    });
  });

  describe("POST /lists", () => {
    it("creates a list owned by the caller with a fresh invite code", async () => {
      const res = await request(app)
        .post("/lists")
        .set(auth(owner))
        .send({ name: "  Weekly shop  " });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: "Weekly shop",
        role: "OWNER",
        member_count: 1,
        item_count: 0,
        unchecked_count: 0,
      });
      expect(res.body.invite_code).toMatch(/^[A-F0-9]{8}$/);
      await db.query("DELETE FROM household_lists WHERE id = $1", [
        res.body.id,
      ]);
    });

    it.each([
      ["empty", { name: "" }],
      ["blank", { name: "   " }],
      ["too long", { name: "x".repeat(101) }],
      ["missing", {}],
    ])("rejects a %s name with field details", async (_label, body) => {
      const res = await request(app).post("/lists").set(auth(owner)).send(body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
      expect(res.body.details[0].path).toEqual(["name"]);
    });
  });

  describe("GET /lists, /lists/my-list and /lists/:id", () => {
    it("returns 404 NO_LIST from my-list for a user with no lists (not a 500)", async () => {
      const res = await request(app).get("/lists/my-list").set(auth(stranger));
      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NO_LIST");
    });

    it("returns only the caller's lists, most recently joined first, and my-list is the newest", async () => {
      const solo = await createListUser();
      const first = await createListViaApi(app, solo, "First");
      await new Promise((r) => setTimeout(r, 15));
      const second = await createListViaApi(app, solo, "Second");

      const list = await request(app).get("/lists").set(auth(solo));
      expect(list.status).toBe(200);
      expect(list.body.data.map((l: any) => l.id)).toEqual([
        second.id,
        first.id,
      ]);

      const current = await request(app).get("/lists/my-list").set(auth(solo));
      expect(current.body).toMatchObject({
        id: second.id,
        name: "Second",
        role: "OWNER",
      });
      expect(current.body).toHaveProperty("invite_code");

      const other = await request(app).get("/lists").set(auth(stranger));
      expect(other.body.data).toEqual([]);
    });

    it("returns members (name and role only, no e-mail) and items for a member", async () => {
      const list = await createListViaApi(app, owner, "Detail");
      await addMemberDirect(list.id, member.id);
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "Bread" });

      const res = await request(app).get(`/lists/${list.id}`).set(auth(member));
      expect(res.status).toBe(200);
      expect(res.body.role).toBe("MEMBER");
      expect(res.body.viewer_id).toBe(member.id);
      expect(res.body.members.map((m: any) => [m.full_name, m.role])).toEqual([
        ["Olu Owner", "OWNER"],
        ["Mia Member", "MEMBER"],
      ]);
      expect(JSON.stringify(res.body.members)).not.toContain("@lists.test");
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        item_name: "Bread",
        is_checked: false,
      });
    });

    it("hides a list from non-members with the same 404 as a missing list", async () => {
      const list = await createListViaApi(app, owner, "Private");
      const hidden = await request(app)
        .get(`/lists/${list.id}`)
        .set(auth(stranger));
      const missing = await request(app)
        .get("/lists/00000000-0000-4000-8000-000000000000")
        .set(auth(stranger));
      expect(hidden.status).toBe(404);
      expect(hidden.body).toEqual(missing.body);
    });

    it("returns 400 for a malformed list id", async () => {
      const res = await request(app).get("/lists/not-a-uuid").set(auth(owner));
      expect(res.status).toBe(400);
    });
  });

  describe("POST /lists/join", () => {
    it("joins by invite code (case-insensitive, trimmed) and announces the new member", async () => {
      const list = await createListViaApi(app, owner, "Joinable");
      const res = await request(app)
        .post("/lists/join")
        .set(auth(member))
        .send({ invite_code: `  ${list.invite_code.toLowerCase()} ` });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: list.id,
        role: "MEMBER",
        member_count: 2,
        already_member: false,
      });
      const joined = eventsOf("list_member_joined");
      expect(joined).toHaveLength(1);
      expect(joined[0].room).toBe(`list:${list.id}`);
      expect(joined[0].payload).toMatchObject({
        user_id: member.id,
        full_name: "Mia Member",
      });
    });

    it("is idempotent for an existing member (200, no duplicate row, no event)", async () => {
      const list = await createListViaApi(app, owner, "Twice");
      await addMemberDirect(list.id, member.id);
      const res = await request(app)
        .post("/lists/join")
        .set(auth(member))
        .send({ invite_code: list.invite_code });
      expect(res.status).toBe(200);
      expect(res.body.already_member).toBe(true);
      expect(eventsOf("list_member_joined")).toHaveLength(0);
      const { rows } = await db.query(
        "SELECT COUNT(*)::int AS n FROM household_list_members WHERE list_id = $1",
        [list.id],
      );
      expect(rows[0].n).toBe(2);
    });

    it("rejects an unknown code with 404 INVALID_INVITE and a malformed code with 400", async () => {
      const unknown = await request(app)
        .post("/lists/join")
        .set(auth(member))
        .send({ invite_code: "ZZZZ9999" });
      expect(unknown.status).toBe(404);
      expect(unknown.body.code).toBe("INVALID_INVITE");
      expect(
        (
          await request(app)
            .post("/lists/join")
            .set(auth(member))
            .send({ invite_code: "ab!" })
        ).status,
      ).toBe(400);
      expect(
        (await request(app).post("/lists/join").set(auth(member)).send({}))
          .status,
      ).toBe(400);
    });

    it(`refuses new members once a list has ${MAX_LIST_MEMBERS} members`, async () => {
      const list = await createListViaApi(app, owner, "Full");
      for (let i = 1; i < MAX_LIST_MEMBERS; i++)
        await addMemberDirect(list.id, (await createListUser()).id);
      const res = await request(app)
        .post("/lists/join")
        .set(auth(stranger))
        .send({ invite_code: list.invite_code });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe("LIST_FULL");
    });
  });

  describe("PATCH and DELETE /lists/:id", () => {
    it("lets the owner rename, and broadcasts the new name", async () => {
      const list = await createListViaApi(app, owner, "Old name");
      const res = await request(app)
        .patch(`/lists/${list.id}`)
        .set(auth(owner))
        .send({ name: "New name" });
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("New name");
      expect(eventsOf("list_updated")[0].payload).toEqual({
        list_id: list.id,
        name: "New name",
      });
    });

    it("forbids members from renaming (403) and hides the list from strangers (404)", async () => {
      const list = await createListViaApi(app, owner, "Locked");
      await addMemberDirect(list.id, member.id);
      expect(
        (
          await request(app)
            .patch(`/lists/${list.id}`)
            .set(auth(member))
            .send({ name: "Hax" })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(app)
            .patch(`/lists/${list.id}`)
            .set(auth(stranger))
            .send({ name: "Hax" })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app)
            .patch(`/lists/${list.id}`)
            .set(auth(owner))
            .send({ name: "" })
        ).status,
      ).toBe(400);
    });

    it("lets the owner delete the list, cascades members and items, and closes the room", async () => {
      const list = await createListViaApi(app, owner, "Doomed");
      await addMemberDirect(list.id, member.id);
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "Eggs" });

      const res = await request(app)
        .delete(`/lists/${list.id}`)
        .set(auth(owner));
      expect(res.status).toBe(204);
      for (const table of [
        "household_lists",
        "household_list_members",
        "household_list_items",
      ]) {
        const col = table === "household_lists" ? "id" : "list_id";
        expect(
          (
            await db.query(`SELECT 1 FROM ${table} WHERE ${col} = $1`, [
              list.id,
            ])
          ).rowCount,
        ).toBe(0);
      }
      expect(eventsOf("list_deleted")).toHaveLength(1);
      expect(mockLeft).toEqual([
        { fromRoom: `list:${list.id}`, room: `list:${list.id}` },
      ]);
    });

    it("forbids members from deleting and leaves the list intact", async () => {
      const list = await createListViaApi(app, owner, "Safe");
      await addMemberDirect(list.id, member.id);
      expect(
        (await request(app).delete(`/lists/${list.id}`).set(auth(member)))
          .status,
      ).toBe(403);
      expect(
        (
          await db.query("SELECT 1 FROM household_lists WHERE id = $1", [
            list.id,
          ])
        ).rowCount,
      ).toBe(1);
    });
  });

  describe("POST /lists/:id/leave", () => {
    it("lets a member leave, evicts their sockets and tells the room", async () => {
      const list = await createListViaApi(app, owner, "Leave me");
      await addMemberDirect(list.id, member.id);
      const res = await request(app)
        .post(`/lists/${list.id}/leave`)
        .set(auth(member));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ list_deleted: false, new_owner_id: null });
      expect(
        await request(app)
          .get(`/lists/${list.id}`)
          .set(auth(member))
          .then((r) => r.status),
      ).toBe(404);
      expect(mockLeft[0]).toEqual({
        fromRoom: `user:${member.id}`,
        room: `list:${list.id}`,
      });
      expect(eventsOf("list_member_left")[0].payload).toMatchObject({
        user_id: member.id,
      });
    });

    it("transfers ownership to the longest-standing member when the owner leaves", async () => {
      const list = await createListViaApi(app, owner, "Handover");
      const newer = await createListUser();
      await addMemberDirect(list.id, member.id);
      await new Promise((r) => setTimeout(r, 15));
      await addMemberDirect(list.id, newer.id);

      const res = await request(app)
        .post(`/lists/${list.id}/leave`)
        .set(auth(owner));
      expect(res.body).toEqual({
        list_deleted: false,
        new_owner_id: member.id,
      });
      const roles = await db.query(
        "SELECT user_id, role FROM household_list_members WHERE list_id = $1",
        [list.id],
      );
      expect(
        Object.fromEntries(roles.rows.map((r) => [r.user_id, r.role])),
      ).toEqual({
        [member.id]: "OWNER",
        [newer.id]: "MEMBER",
      });
    });

    it("deletes the list when its only member leaves", async () => {
      const solo = await createListUser();
      const list = await createListViaApi(app, solo, "Solo");
      const res = await request(app)
        .post(`/lists/${list.id}/leave`)
        .set(auth(solo));
      expect(res.body).toEqual({ list_deleted: true, new_owner_id: null });
      expect(
        (
          await db.query("SELECT 1 FROM household_lists WHERE id = $1", [
            list.id,
          ])
        ).rowCount,
      ).toBe(0);
    });

    it("404s for a non-member", async () => {
      const list = await createListViaApi(app, owner, "Not yours");
      expect(
        (await request(app).post(`/lists/${list.id}/leave`).set(auth(stranger)))
          .status,
      ).toBe(404);
    });
  });

  describe("DELETE /lists/:id/members/:user_id", () => {
    it("lets the owner remove a member, who is then locked out and notified", async () => {
      const list = await createListViaApi(app, owner, "Roster");
      await addMemberDirect(list.id, member.id);

      const res = await request(app)
        .delete(`/lists/${list.id}/members/${member.id}`)
        .set(auth(owner));
      expect(res.status).toBe(204);
      expect(
        (await request(app).get(`/lists/${list.id}`).set(auth(member))).status,
      ).toBe(404);
      expect(mockLeft[0]).toEqual({
        fromRoom: `user:${member.id}`,
        room: `list:${list.id}`,
      });
      expect(eventsOf("list_access_revoked")[0]).toMatchObject({
        room: `user:${member.id}`,
        payload: { list_id: list.id },
      });
      expect(eventsOf("list_member_left")[0].payload).toMatchObject({
        user_id: member.id,
        removed: true,
      });
    });

    it("forbids members, blocks self-removal, and 404s for non-members", async () => {
      const list = await createListViaApi(app, owner, "Rules");
      await addMemberDirect(list.id, member.id);
      expect(
        (
          await request(app)
            .delete(`/lists/${list.id}/members/${owner.id}`)
            .set(auth(member))
        ).status,
      ).toBe(403);
      const self = await request(app)
        .delete(`/lists/${list.id}/members/${owner.id}`)
        .set(auth(owner));
      expect(self.status).toBe(400);
      expect(self.body.code).toBe("USE_LEAVE");
      expect(
        (
          await request(app)
            .delete(`/lists/${list.id}/members/${stranger.id}`)
            .set(auth(owner))
        ).status,
      ).toBe(404);
    });
  });

  describe("invite code regeneration", () => {
    it.each(["regenerate-invite", "regenerate-invite-code"])(
      "POST /lists/:id/%s gives the owner a new code that replaces the old one",
      async (route) => {
        const list = await createListViaApi(app, owner, "Rotate");
        const res = await request(app)
          .post(`/lists/${list.id}/${route}`)
          .set(auth(owner));
        expect(res.status).toBe(200);
        expect(res.body.invite_code).toMatch(/^[A-F0-9]{8}$/);
        expect(res.body.invite_code).not.toBe(list.invite_code);

        const oldCode = await request(app)
          .post("/lists/join")
          .set(auth(stranger))
          .send({ invite_code: list.invite_code });
        expect(oldCode.status).toBe(404);
        expect(eventsOf("list_updated")[0].payload).toEqual({
          list_id: list.id,
          invite_code: res.body.invite_code,
        });
      },
    );

    it("rejects members with 403 and the original wording", async () => {
      const list = await createListViaApi(app, owner, "Rotate 2");
      await addMemberDirect(list.id, member.id);
      const res = await request(app)
        .post(`/lists/${list.id}/regenerate-invite`)
        .set(auth(member));
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/owners can regenerate/i);
    });
  });

  describe("items", () => {
    let list: { id: string };

    beforeEach(async () => {
      list = await createListViaApi(app, owner, "Items");
      await addMemberDirect(list.id, member.id);
      mockEmitted.length = 0;
    });

    it("adds a catalogue product, copying its name so deleting the product can't blank the line", async () => {
      const res = await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(member))
        .send({ product_id: milk.id, quantity: 2 });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        product_id: milk.id,
        item_name: "Test Milk",
        custom_item_name: "Test Milk",
        quantity: 2,
        is_checked: false,
        added_by: member.id,
        already_on_list: false,
      });
      const event = eventsOf("list_item_updated");
      expect(event).toHaveLength(1);
      expect(event[0].room).toBe(`list:${list.id}`);
    });

    it("upserts: adding the same product again sums quantity, un-checks it and flags already_on_list", async () => {
      const first = await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ product_id: milk.id, quantity: 1 });
      await request(app)
        .patch(`/lists/${list.id}/items/${first.body.id}`)
        .set(auth(owner))
        .send({ is_checked: true });

      const again = await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(member))
        .send({ product_id: milk.id, quantity: 2 });
      expect(again.status).toBe(201);
      expect(again.body).toMatchObject({
        id: first.body.id,
        quantity: 3,
        is_checked: false,
        already_on_list: true,
      });
      expect(
        (
          await db.query(
            "SELECT COUNT(*)::int AS n FROM household_list_items WHERE list_id = $1",
            [list.id],
          )
        ).rows[0].n,
      ).toBe(1);
    });

    it("caps a merged quantity at 999", async () => {
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ product_id: milk.id, quantity: 990 });
      const res = await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ product_id: milk.id, quantity: 50 });
      expect(res.body.quantity).toBe(999);
    });

    it("handles 10 simultaneous adds of one product without losing updates", async () => {
      const results = await Promise.all(
        Array.from({ length: 10 }, () =>
          request(app)
            .post(`/lists/${list.id}/items`)
            .set(auth(owner))
            .send({ product_id: milk.id, quantity: 1 }),
        ),
      );
      expect(results.every((r) => r.status === 201)).toBe(true);
      const { rows } = await db.query(
        "SELECT quantity FROM household_list_items WHERE list_id = $1",
        [list.id],
      );
      expect(rows).toEqual([{ quantity: 10 }]);
    });

    it("adds custom items and merges repeats by name, ignoring case", async () => {
      const a = await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "Birthday candles" });
      expect(a.body).toMatchObject({
        product_id: null,
        item_name: "Birthday candles",
        custom_item_name: "Birthday candles",
        already_on_list: false,
      });
      const b = await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(member))
        .send({ custom_item_name: "birthday CANDLES", quantity: 2 });
      expect(b.body).toMatchObject({
        id: a.body.id,
        quantity: 3,
        already_on_list: true,
      });
    });

    it("refuses non-members and writes nothing (previously any signed-in user could write to any list)", async () => {
      const res = await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(stranger))
        .send({ custom_item_name: "Sneaky" });
      expect(res.status).toBe(404);
      expect(
        (
          await db.query(
            "SELECT 1 FROM household_list_items WHERE list_id = $1",
            [list.id],
          )
        ).rowCount,
      ).toBe(0);
      expect(eventsOf("list_item_updated")).toHaveLength(0);
    });

    it("validates the body and the product", async () => {
      const post = (body: object) =>
        request(app)
          .post(`/lists/${list.id}/items`)
          .set(auth(owner))
          .send(body);
      expect((await post({})).status).toBe(400);
      expect((await post({ custom_item_name: "x", quantity: 0 })).status).toBe(
        400,
      );
      expect(
        (await post({ custom_item_name: "x", quantity: 1000 })).status,
      ).toBe(400);
      expect((await post({ product_id: "nope" })).status).toBe(400);
      const ghost = await post({
        product_id: "00000000-0000-4000-8000-000000000000",
      });
      expect(ghost.status).toBe(404);
      expect(ghost.body.code).toBe("PRODUCT_NOT_FOUND");
    });

    it(`stops new lines at ${MAX_LIST_ITEMS} items but still lets existing lines be bumped`, async () => {
      await db.query(
        `INSERT INTO household_list_items (list_id, custom_item_name, item_name)
         SELECT $1, 'Filler ' || g, 'Filler ' || g FROM generate_series(1, $2) g`,
        [list.id, MAX_LIST_ITEMS - 1],
      );
      expect(
        (
          await request(app)
            .post(`/lists/${list.id}/items`)
            .set(auth(owner))
            .send({ custom_item_name: "Last one" })
        ).status,
      ).toBe(201);
      const over = await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "One too many" });
      expect(over.status).toBe(409);
      expect(over.body.code).toBe("LIST_ITEMS_LIMIT");
      const bump = await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "last ONE" });
      expect(bump.status).toBe(201);
    });

    it("PATCH checks, edits quantity and renames; broadcasts each change", async () => {
      const item = (
        await request(app)
          .post(`/lists/${list.id}/items`)
          .set(auth(owner))
          .send({ custom_item_name: "Rice" })
      ).body;
      mockEmitted.length = 0;

      const checked = await request(app)
        .patch(`/lists/${list.id}/items/${item.id}`)
        .set(auth(member))
        .send({ is_checked: true });
      expect(checked.body.is_checked).toBe(true);
      const edited = await request(app)
        .patch(`/lists/${list.id}/items/${item.id}`)
        .set(auth(member))
        .send({ quantity: 5, custom_item_name: "Basmati rice" });
      expect(edited.body).toMatchObject({
        quantity: 5,
        item_name: "Basmati rice",
        custom_item_name: "Basmati rice",
      });
      expect(eventsOf("list_item_updated")).toHaveLength(2);
    });

    it("PATCH validates input and refuses other lists' items and non-members", async () => {
      const item = (
        await request(app)
          .post(`/lists/${list.id}/items`)
          .set(auth(owner))
          .send({ custom_item_name: "Tea" })
      ).body;
      const patch = (id: string, who: ListTestUser, body: object) =>
        request(app)
          .patch(`/lists/${list.id}/items/${id}`)
          .set(auth(who))
          .send(body);
      expect((await patch(item.id, owner, {})).status).toBe(400);
      expect((await patch(item.id, owner, { quantity: 0 })).status).toBe(400);
      expect(
        (await patch(item.id, stranger, { is_checked: true })).status,
      ).toBe(404);
      expect(
        (
          await patch("00000000-0000-4000-8000-000000000000", owner, {
            is_checked: true,
          })
        ).status,
      ).toBe(404);

      const other = await createListViaApi(app, owner, "Other list");
      const cross = await request(app)
        .patch(`/lists/${other.id}/items/${item.id}`)
        .set(auth(owner))
        .send({ is_checked: true });
      expect(cross.status).toBe(404); // the item belongs to a different list
    });

    it("DELETE removes an item for any member and broadcasts list_item_removed", async () => {
      const item = (
        await request(app)
          .post(`/lists/${list.id}/items`)
          .set(auth(owner))
          .send({ custom_item_name: "Salt" })
      ).body;
      mockEmitted.length = 0;
      expect(
        (
          await request(app)
            .delete(`/lists/${list.id}/items/${item.id}`)
            .set(auth(stranger))
        ).status,
      ).toBe(404);
      expect(
        (
          await request(app)
            .delete(`/lists/${list.id}/items/${item.id}`)
            .set(auth(member))
        ).status,
      ).toBe(204);
      expect(eventsOf("list_item_removed")[0].payload).toEqual({
        list_id: list.id,
        id: item.id,
      });
      expect(
        (
          await request(app)
            .delete(`/lists/${list.id}/items/${item.id}`)
            .set(auth(member))
        ).status,
      ).toBe(404);
    });

    it("keeps the line visible with its name after the product is deleted (orphan prevention)", async () => {
      const doomed = await createCatalogueProduct("Short-lived Cheese");
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ product_id: doomed.id });
      await db.query("DELETE FROM products WHERE id = $1", [doomed.id]);

      const detail = await request(app)
        .get(`/lists/${list.id}`)
        .set(auth(owner));
      expect(detail.body.items[0]).toMatchObject({
        product_id: null,
        item_name: "Short-lived Cheese",
        custom_item_name: "Short-lived Cheese",
      });
    });
  });
});
