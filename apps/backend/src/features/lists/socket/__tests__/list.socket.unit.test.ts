import redisClient from "@/config/redis";
import { authenticateSocket } from "@/features/lists/socket/list.socket";
import { generateMockToken } from "@/utils/testAuth";

jest.mock("@/config/redis", () => ({
  __esModule: true,
  default: { isOpen: false, get: jest.fn() },
}));
const redis = redisClient as unknown as { isOpen: boolean; get: jest.Mock };

const ID = "11111111-1111-4111-8111-111111111111";

function run(handshake: object) {
  const socket: any = { handshake, data: {} };
  return new Promise<{ error?: Error; socket: any }>((resolve) =>
    authenticateSocket(socket, (error) => resolve({ error, socket })),
  );
}

describe("authenticateSocket", () => {
  beforeEach(() => {
    redis.isOpen = false;
    redis.get.mockReset();
  });

  it("accepts a valid token passed in handshake.auth and exposes the user", async () => {
    const { error, socket } = await run({
      auth: { token: generateMockToken(ID, "CUSTOMER") },
      headers: {},
    });
    expect(error).toBeUndefined();
    expect(socket.data.user).toEqual({ id: ID, role: "CUSTOMER" });
  });

  it("also accepts an Authorization: Bearer header", async () => {
    const { error } = await run({
      auth: {},
      headers: { authorization: `Bearer ${generateMockToken(ID)}` },
    });
    expect(error).toBeUndefined();
  });

  it.each([
    ["no token", { auth: {}, headers: {} }],
    ["a garbage token", { auth: { token: "nope" }, headers: {} }],
    ["a non-string token", { auth: { token: 123 }, headers: {} }],
    [
      "an expired token",
      {
        auth: { token: generateMockToken(ID, "CUSTOMER", "-1h") },
        headers: {},
      },
    ],
  ])("rejects %s with UNAUTHORIZED", async (_label, handshake) => {
    const { error, socket } = await run(handshake);
    expect(error?.message).toBe("UNAUTHORIZED");
    expect(socket.data.user).toBeUndefined();
  });

  it("rejects a suspended account when Redis flags it (SRS 1.3.2)", async () => {
    redis.isOpen = true;
    redis.get.mockResolvedValue("true");
    const { error } = await run({
      auth: { token: generateMockToken(ID) },
      headers: {},
    });
    expect(error?.message).toBe("ACCOUNT_SUSPENDED");
    expect(redis.get).toHaveBeenCalledWith(`suspended:${ID}`);
  });

  it("fails open if Redis errors, matching requireAuth", async () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    redis.isOpen = true;
    redis.get.mockRejectedValue(new Error("redis down"));
    const { error } = await run({
      auth: { token: generateMockToken(ID) },
      headers: {},
    });
    expect(error).toBeUndefined();
    spy.mockRestore();
  });
});
