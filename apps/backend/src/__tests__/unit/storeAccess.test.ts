import { db } from "@/config/database";
import { requireStoreAccess } from "@/middleware/storeAccess";
import type { NextFunction, Request, Response } from "express";

jest.mock("@/config/database", () => ({ db: { query: jest.fn() } }));
const query = db.query as jest.Mock;

const STORE = "11111111-1111-4111-8111-111111111111";
const OWNER = "22222222-2222-4222-8222-222222222222";

async function run(source: "header" | "param", req: Partial<Request>) {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  await requireStoreAccess(source)(req as Request, res, next);
  return {
    res,
    next,
  };
}

describe("requireStoreAccess", () => {
  beforeEach(() => jest.clearAllMocks());

  it("401s without an authenticated user", async () => {
    const { res } = await run("header", { headers: {}, params: {} });
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("400s when the X-Store-ID header is missing", async () => {
    const { res } = await run("header", {
      user: { id: OWNER, role: "STORE_OWNER" },
      headers: {},
      params: {},
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Missing X-Store-ID header",
    });
  });

  it("400s on a malformed id without touching the database", async () => {
    const { res } = await run("param", {
      user: { id: OWNER, role: "STORE_OWNER" },
      headers: {},
      params: { storeId: "mine" },
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(query).not.toHaveBeenCalled();
  });

  it("404s for an unknown store", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const { res } = await run("param", {
      user: { id: OWNER, role: "STORE_OWNER" },
      headers: {},
      params: { storeId: STORE },
    });
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("403s when the store belongs to someone else", async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: STORE, owner_id: "someone-else", is_suspended: false }],
    });
    const { res, next } = await run("header", {
      user: { id: OWNER, role: "STORE_OWNER" },
      headers: { "x-store-id": STORE },
      params: {},
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("attaches req.store and continues for the owner", async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: STORE, owner_id: OWNER, is_suspended: true }],
    });
    const req = {
      user: { id: OWNER, role: "STORE_OWNER" },
      headers: { "x-store-id": STORE },
      params: {},
    } as Partial<Request>;
    const { next } = await run("header", req);
    expect(next).toHaveBeenCalled();
    expect(req.store).toEqual({ id: STORE, ownerId: OWNER, isSuspended: true });
  });

  it("500s when the lookup fails", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    query.mockRejectedValueOnce(new Error("db down"));
    const { res } = await run("header", {
      user: { id: OWNER, role: "STORE_OWNER" },
      headers: { "x-store-id": STORE },
      params: {},
    });
    expect(res.status).toHaveBeenCalledWith(500);
    spy.mockRestore();
  });
});
