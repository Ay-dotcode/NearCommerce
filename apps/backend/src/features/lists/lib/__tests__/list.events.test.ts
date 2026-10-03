import { getIO } from "@/config/socket";
import {
  closeListRoom,
  emitToList,
  emitToUser,
  removeUserFromListRoom,
} from "@/features/lists/lib/list.events";

jest.mock("@/config/socket", () => ({ getIO: jest.fn() }));
const getIOMock = getIO as jest.Mock;

describe("list realtime helpers", () => {
  let warn: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => warn.mockRestore());

  it("emits to the list room and the user room using the agreed prefixes", () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    getIOMock.mockReturnValue({ to });

    emitToList("L1", "evt", { a: 1 });
    emitToUser("U1", "evt2", { b: 2 });

    expect(to).toHaveBeenNthCalledWith(1, "list:L1");
    expect(emit).toHaveBeenNthCalledWith(1, "evt", { a: 1 });
    expect(to).toHaveBeenNthCalledWith(2, "user:U1");
    expect(emit).toHaveBeenNthCalledWith(2, "evt2", { b: 2 });
  });

  it("evicts only the given user's sockets from the list room", () => {
    const socketsLeave = jest.fn();
    const inRoom = jest.fn().mockReturnValue({ socketsLeave });
    getIOMock.mockReturnValue({ in: inRoom });

    removeUserFromListRoom("L1", "U1");

    expect(inRoom).toHaveBeenCalledWith("user:U1");
    expect(socketsLeave).toHaveBeenCalledWith("list:L1");
  });

  it("empties a deleted list's room", () => {
    const socketsLeave = jest.fn();
    getIOMock.mockReturnValue({
      in: jest.fn().mockReturnValue({ socketsLeave }),
    });
    closeListRoom("L1");
    expect(socketsLeave).toHaveBeenCalledWith("list:L1");
  });

  it("never throws when the socket server is not initialised (HTTP must not fail because of realtime)", () => {
    getIOMock.mockImplementation(() => {
      throw new Error("[SOCKET] Socket.io has not been initialized.");
    });
    expect(() => emitToList("L1", "evt", {})).not.toThrow();
    expect(() => emitToUser("U1", "evt", {})).not.toThrow();
    expect(() => removeUserFromListRoom("L1", "U1")).not.toThrow();
    expect(() => closeListRoom("L1")).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(4);
  });

  it("swallows errors thrown while emitting (e.g. a Redis adapter failure)", () => {
    getIOMock.mockReturnValue({
      to: () => ({
        emit: () => {
          throw new Error("redis down");
        },
      }),
    });
    expect(() => emitToList("L1", "evt", {})).not.toThrow();
  });
});
