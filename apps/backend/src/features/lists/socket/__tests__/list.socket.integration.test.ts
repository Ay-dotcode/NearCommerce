import { app } from "@/app";
import { db } from "@/config/database";
import { createSocketServer } from "@/config/socket";
import {
  addMemberDirect,
  auth,
  cleanupListFixtures,
  createCatalogueProduct,
  createListUser,
  createListViaApi,
  ListTestUser,
} from "@/features/lists/api/__tests__/listFixtures";
import http from "http";
import { AddressInfo } from "net";
import type { Server } from "socket.io";
import { io as connect, Socket } from "socket.io-client";
import request from "supertest";

const WAIT_MS = 2000;

// Resolves with the next payload of `event`, or rejects after WAIT_MS.
const next = <T = any>(socket: Socket, event: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timed out waiting for "${event}"`)),
      WAIT_MS,
    );
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

// Asserts nothing arrives for `event` in a short window.
const silent = (socket: Socket, event: string, ms = 250): Promise<void> =>
  new Promise((resolve, reject) => {
    const handler = () => reject(new Error(`unexpected "${event}"`));
    socket.once(event, handler);
    setTimeout(() => {
      socket.off(event, handler);
      resolve();
    }, ms);
  });

describe("List sockets (real socket.io server and clients)", () => {
  let httpServer: http.Server;
  let ioServer: Server;
  let url: string;
  let owner: ListTestUser;
  let member: ListTestUser;
  let stranger: ListTestUser;
  let list: { id: string };
  const open: Socket[] = [];

  const client = (user: ListTestUser | null, extra: object = {}) => {
    const socket = connect(url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      auth: user ? { token: user.token } : {},
      ...extra,
    });
    open.push(socket);
    return socket;
  };
  const ready = (socket: Socket) => next(socket, "connect");

  // Connects, joins the list room and waits for the state snapshot.
  const joined = async (user: ListTestUser, listId = list.id) => {
    const socket = client(user);
    await ready(socket);
    const state = next(socket, "list_state");
    socket.emit("join_list", listId);
    return { socket, state: await state };
  };

  beforeAll(async () => {
    httpServer = http.createServer(app);
    ioServer = createSocketServer(httpServer);
    await new Promise<void>((r) => httpServer.listen(0, r));
    url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;

    owner = await createListUser("CUSTOMER", "Olu Owner");
    member = await createListUser("CUSTOMER", "Mia Member");
    stranger = await createListUser("CUSTOMER", "Sam Stranger");
  });

  beforeEach(async () => {
    list = await createListViaApi(app, owner, "Realtime");
    await addMemberDirect(list.id, member.id);
  });

  afterEach(async () => {
    open.splice(0).forEach((s) => s.disconnect());
    await db.query(`DELETE FROM household_lists WHERE id = $1`, [list.id]);
  });

  afterAll(async () => {
    await cleanupListFixtures();
    await new Promise<void>((r) => ioServer.close(() => r()));
    await db.end();
  });

  describe("handshake", () => {
    it("rejects connections without a valid token", async () => {
      for (const socket of [
        client(null),
        client({ token: "garbage" } as any),
      ]) {
        const error = await next<Error>(socket, "connect_error");
        expect(error.message).toBe("UNAUTHORIZED");
      }
    });

    it("accepts a valid token", async () => {
      const socket = client(owner);
      await ready(socket);
      expect(socket.connected).toBe(true);
    });
  });

  describe("join_list", () => {
    it("lets a member join and returns the current list as a snapshot", async () => {
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "Bread" });
      const { state } = await joined(member);
      expect(state).toMatchObject({
        id: list.id,
        name: "Realtime",
        role: "MEMBER",
      });
      expect(state.items.map((i: any) => i.item_name)).toEqual(["Bread"]);
      expect(state.members).toHaveLength(2);
    });

    it("refuses a non-member: error event and failed ack, and no later broadcasts reach them", async () => {
      const socket = client(stranger);
      await ready(socket);
      const err = next(socket, "list_error");
      const ack = await new Promise<any>((resolve) =>
        socket.emit("join_list", list.id, resolve),
      );
      expect(ack).toMatchObject({ ok: false, code: "LIST_NOT_FOUND" });
      expect(await err).toMatchObject({
        event: "join_list",
        code: "LIST_NOT_FOUND",
      });

      const leak = silent(socket, "list_item_updated");
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "Secret" });
      await leak;
    });

    it("rejects a malformed list id without crashing the server", async () => {
      const socket = client(owner);
      await ready(socket);
      const err = next(socket, "list_error");
      socket.emit("join_list", "not-a-uuid");
      expect(await err).toMatchObject({ code: "VALIDATION_FAILED" });
      expect(socket.connected).toBe(true);
    });
  });

  describe("realtime item changes", () => {
    it("add_item from one member reaches the other member and persists", async () => {
      const a = await joined(owner);
      const b = await joined(member);
      const seen = next(b.socket, "list_item_updated");

      const ack = await new Promise<any>((resolve) =>
        a.socket.emit(
          "add_item",
          { listId: list.id, customItemName: "Oat milk", quantity: 2 },
          resolve,
        ),
      );

      expect(ack).toEqual({ ok: true });
      expect(await seen).toMatchObject({
        item_name: "Oat milk",
        quantity: 2,
        is_checked: false,
        added_by: owner.id,
      });
      const { rows } = await db.query(
        "SELECT item_name FROM household_list_items WHERE list_id = $1",
        [list.id],
      );
      expect(rows).toEqual([{ item_name: "Oat milk" }]);
    });

    it("add_item with a product that is already on the list flags already_on_list", async () => {
      const milk = await createCatalogueProduct("Socket Milk");
      const a = await joined(owner);
      a.socket.emit("add_item", {
        listId: list.id,
        productId: milk.id,
        quantity: 1,
      });
      await next(a.socket, "list_item_updated");

      const second = next(a.socket, "list_item_updated");
      a.socket.emit("add_item", {
        listId: list.id,
        productId: milk.id,
        quantity: 2,
      });
      expect(await second).toMatchObject({
        quantity: 3,
        is_checked: false,
        already_on_list: true,
      });
    });

    it("toggle_item accepts the product id (what the mobile app sends) and the item id", async () => {
      const milk = await createCatalogueProduct("Toggle Milk");
      const custom = (
        await request(app)
          .post(`/lists/${list.id}/items`)
          .set(auth(owner))
          .send({ custom_item_name: "Honey" })
      ).body;
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ product_id: milk.id });
      const a = await joined(owner);
      const b = await joined(member);

      const byProduct = next(b.socket, "list_item_updated");
      a.socket.emit("toggle_item", {
        listId: list.id,
        productId: milk.id,
        isChecked: true,
      });
      expect(await byProduct).toMatchObject({
        product_id: milk.id,
        is_checked: true,
      });

      const byItem = next(b.socket, "list_item_updated");
      a.socket.emit("toggle_item", {
        listId: list.id,
        itemId: custom.id,
        isChecked: true,
      });
      expect(await byItem).toMatchObject({ id: custom.id, is_checked: true });

      // mobile fallback: custom items are addressed through the same field as `productId`
      const viaProductField = next(b.socket, "list_item_updated");
      a.socket.emit("toggle_item", {
        listId: list.id,
        productId: custom.id,
        isChecked: false,
      });
      expect(await viaProductField).toMatchObject({
        id: custom.id,
        is_checked: false,
      });
    });

    it("remove_item broadcasts list_item_removed", async () => {
      const item = (
        await request(app)
          .post(`/lists/${list.id}/items`)
          .set(auth(owner))
          .send({ custom_item_name: "Salt" })
      ).body;
      const a = await joined(owner);
      const b = await joined(member);
      const removed = next(b.socket, "list_item_removed");
      a.socket.emit("remove_item", { listId: list.id, itemId: item.id });
      expect(await removed).toEqual({ list_id: list.id, id: item.id });
    });

    it("changes made over REST reach connected sockets", async () => {
      const b = await joined(member);
      const seen = next(b.socket, "list_item_updated");
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "Via REST" });
      expect(await seen).toMatchObject({ item_name: "Via REST" });
    });

    it("a member who is not in the room cannot mutate by emitting to someone else's list", async () => {
      const socket = client(stranger);
      await ready(socket);
      const ack = await new Promise<any>((resolve) =>
        socket.emit(
          "add_item",
          { listId: list.id, customItemName: "Hijack" },
          resolve,
        ),
      );
      expect(ack).toMatchObject({ ok: false, code: "LIST_NOT_FOUND" });
      expect(
        (
          await db.query(
            "SELECT 1 FROM household_list_items WHERE list_id = $1",
            [list.id],
          )
        ).rowCount,
      ).toBe(0);
    });

    it("returns validation errors for bad payloads and keeps the connection alive", async () => {
      const a = await joined(owner);
      for (const [event, payload] of [
        ["add_item", { listId: list.id }],
        ["add_item", { listId: list.id, customItemName: "x", quantity: -1 }],
        ["toggle_item", { listId: list.id, isChecked: true }],
        ["toggle_item", { listId: list.id, itemId: "bad", isChecked: true }],
        ["remove_item", {}],
        ["add_item", null],
        ["add_item", "string"],
      ] as const) {
        const ack = await new Promise<any>((resolve) =>
          a.socket.emit(event, payload, resolve),
        );
        expect(ack).toMatchObject({ ok: false, code: "VALIDATION_FAILED" });
      }
      expect(a.socket.connected).toBe(true);
    });

    it("only reaches sockets subscribed to that list", async () => {
      const otherList = await createListViaApi(app, owner, "Other");
      const onOther = await joined(owner, otherList.id);
      const quiet = silent(onOther.socket, "list_item_updated");
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "Not for you" });
      await quiet;
      await db.query("DELETE FROM household_lists WHERE id = $1", [
        otherList.id,
      ]);
    });

    it("stops delivering after leave_list", async () => {
      const b = await joined(member);
      b.socket.emit("leave_list", list.id);
      await new Promise((r) => setTimeout(r, 100));
      const quiet = silent(b.socket, "list_item_updated");
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "After leave" });
      await quiet;
    });
  });

  describe("membership changes", () => {
    it("removing a member evicts their live socket immediately and notifies them", async () => {
      const b = await joined(member);
      const revoked = next(b.socket, "list_access_revoked");

      await request(app)
        .delete(`/lists/${list.id}/members/${member.id}`)
        .set(auth(owner))
        .expect(204);
      expect(await revoked).toEqual({ list_id: list.id });

      const quiet = silent(b.socket, "list_item_updated");
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "Post-removal" });
      await quiet;
    });

    it("a removed member cannot re-subscribe", async () => {
      await request(app)
        .delete(`/lists/${list.id}/members/${member.id}`)
        .set(auth(owner))
        .expect(204);
      const socket = client(member);
      await ready(socket);
      const ack = await new Promise<any>((resolve) =>
        socket.emit("join_list", list.id, resolve),
      );
      expect(ack).toMatchObject({ ok: false, code: "LIST_NOT_FOUND" });
    });

    it("leaving evicts the leaver and tells the others", async () => {
      const a = await joined(owner);
      const b = await joined(member);
      const left = next(a.socket, "list_member_left");
      await request(app)
        .post(`/lists/${list.id}/leave`)
        .set(auth(member))
        .expect(200);
      expect(await left).toMatchObject({ user_id: member.id });

      const quiet = silent(b.socket, "list_item_updated");
      await request(app)
        .post(`/lists/${list.id}/items`)
        .set(auth(owner))
        .send({ custom_item_name: "Post-leave" });
      await quiet;
    });

    it("a new member joining is announced to people already viewing the list", async () => {
      const a = await joined(owner);
      const joinedEvt = next(a.socket, "list_member_joined");
      const newcomer = await createListUser("CUSTOMER", "Nia Newcomer");
      const code = (
        await request(app).get(`/lists/${list.id}`).set(auth(owner))
      ).body.invite_code;
      await request(app)
        .post("/lists/join")
        .set(auth(newcomer))
        .send({ invite_code: code })
        .expect(201);
      expect(await joinedEvt).toMatchObject({
        user_id: newcomer.id,
        full_name: "Nia Newcomer",
      });
    });

    it("deleting a list notifies viewers and closes the room", async () => {
      const b = await joined(member);
      const deleted = next(b.socket, "list_deleted");
      await request(app)
        .delete(`/lists/${list.id}`)
        .set(auth(owner))
        .expect(204);
      expect(await deleted).toEqual({ list_id: list.id });
    });

    it("renaming and invite regeneration are pushed as list_updated", async () => {
      const b = await joined(member);
      const renamed = next(b.socket, "list_updated");
      await request(app)
        .patch(`/lists/${list.id}`)
        .set(auth(owner))
        .send({ name: "Renamed live" })
        .expect(200);
      expect(await renamed).toEqual({ list_id: list.id, name: "Renamed live" });

      const rotated = next(b.socket, "list_updated");
      const res = await request(app)
        .post(`/lists/${list.id}/regenerate-invite`)
        .set(auth(owner))
        .expect(200);
      expect(await rotated).toEqual({
        list_id: list.id,
        invite_code: res.body.invite_code,
      });
    });
  });
});
