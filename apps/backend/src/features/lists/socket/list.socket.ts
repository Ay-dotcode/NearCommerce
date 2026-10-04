import redisClient from "@/config/redis";
import {
  JWT_ACCESS_SECRET,
  LIST_EVENT_ERROR,
  LIST_EVENT_STATE,
  LIST_ROOM_PREFIX,
  SOCKET_EVENT_ADD_ITEM,
  SOCKET_EVENT_DISCONNECT,
  SOCKET_EVENT_JOIN_LIST,
  SOCKET_EVENT_LEAVE_LIST,
  SOCKET_EVENT_REMOVE_ITEM,
  SOCKET_EVENT_TOGGLE_ITEM,
  USER_ROOM_PREFIX,
} from "@/constants";
import {
  addListItem,
  deleteListItem,
  getListDetail,
  getMemberRole,
  ListError,
  setItemChecked,
} from "@/features/lists/services/list.service";
import {
  SocketAddItemSchema,
  SocketRemoveItemSchema,
  SocketToggleItemSchema,
} from "@nearcommerce/api";
import jwt from "jsonwebtoken";
import type { Server, Socket } from "socket.io";
import { z, ZodError } from "zod";

export interface SocketUser {
  id: string;
  role: string;
}

type Ack = (response: { ok: boolean; error?: string; code?: string }) => void;
const asAck = (candidate: unknown): Ack | undefined =>
  typeof candidate === "function" ? (candidate as Ack) : undefined;

const UuidSchema = z.string().uuid();

// Handshake authentication. Clients pass the same access token they use for REST:
//   io(url, { auth: { token } })
// Mirrors requireAuth, including the Redis suspension flag (SRS 1.3.2).
export async function authenticateSocket(
  socket: Pick<Socket, "handshake" | "data">,
  next: (err?: Error) => void,
) {
  try {
    const header = socket.handshake.headers?.authorization;
    const token =
      (typeof socket.handshake.auth?.token === "string" &&
        socket.handshake.auth.token) ||
      (typeof header === "string" && header.startsWith("Bearer ")
        ? header.slice(7)
        : "");
    if (!token) return next(new Error("UNAUTHORIZED"));

    const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as {
      id: string;
      role: string;
    };

    let suspended: string | null = null;
    try {
      if (redisClient.isOpen)
        suspended = await redisClient.get(`suspended:${decoded.id}`);
    } catch (redisError) {
      console.error("[SOCKET AUTH] Redis check error:", redisError);
    }
    if (suspended === "true") return next(new Error("ACCOUNT_SUSPENDED"));

    socket.data.user = {
      id: decoded.id,
      role: decoded.role,
    } satisfies SocketUser;
    return next();
  } catch {
    return next(new Error("UNAUTHORIZED"));
  }
}

function describeError(error: unknown): { message: string; code: string } {
  if (error instanceof ZodError)
    return {
      message: error.issues[0]?.message ?? "Invalid request",
      code: "VALIDATION_FAILED",
    };
  if (error instanceof ListError)
    return { message: error.message, code: error.code ?? "ERROR" };
  console.error("[SOCKET] handler error:", error);
  return { message: "Something went wrong", code: "INTERNAL" };
}

// Wraps a handler so failures reach the client as `list_error` (and the ack), never crash the process.
function guarded<T>(
  socket: Socket,
  event: string,
  handler: (payload: unknown, user: SocketUser) => Promise<T>,
) {
  socket.on(event, async (payload: unknown, maybeAck?: unknown) => {
    const ack = asAck(maybeAck) ?? asAck(payload);
    try {
      await handler(
        typeof payload === "function" ? undefined : payload,
        socket.data.user,
      );
      ack?.({ ok: true });
    } catch (error) {
      const { message, code } = describeError(error);
      socket.emit(LIST_EVENT_ERROR, { event, message, code });
      ack?.({ ok: false, error: message, code });
    }
  });
}

export function registerListSocketHandlers(io: Server) {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;
    // Personal room, used to notify or evict one user across all of their devices.
    socket.join(`${USER_ROOM_PREFIX}${user.id}`);

    guarded(socket, SOCKET_EVENT_JOIN_LIST, async (payload, u) => {
      const listId = UuidSchema.parse(payload);
      // Only members may subscribe; non-members get the same answer as a missing list.
      if (!(await getMemberRole(listId, u.id)))
        throw new ListError(404, "List not found", "LIST_NOT_FOUND");
      await socket.join(`${LIST_ROOM_PREFIX}${listId}`);
      // Snapshot on join: clients start with the current items instead of an empty list.
      socket.emit(LIST_EVENT_STATE, await getListDetail(listId, u.id));
    });

    socket.on(SOCKET_EVENT_LEAVE_LIST, (listId: unknown) => {
      if (UuidSchema.safeParse(listId).success)
        socket.leave(`${LIST_ROOM_PREFIX}${listId as string}`);
    });

    // The service layer re-checks membership on every mutation and broadcasts the result
    // to the list room, so these handlers only validate input.
    guarded(socket, SOCKET_EVENT_ADD_ITEM, async (payload, u) => {
      const p = SocketAddItemSchema.parse(payload);
      await addListItem({
        list_id: p.listId,
        product_id: p.productId,
        custom_item_name: p.customItemName,
        quantity: p.quantity,
        user_id: u.id,
      });
    });

    guarded(socket, SOCKET_EVENT_TOGGLE_ITEM, async (payload, u) => {
      const p = SocketToggleItemSchema.parse(payload);
      await setItemChecked(
        p.listId,
        u.id,
        { productId: p.productId, itemId: p.itemId },
        p.isChecked,
      );
    });

    guarded(socket, SOCKET_EVENT_REMOVE_ITEM, async (payload, u) => {
      const p = SocketRemoveItemSchema.parse(payload);
      await deleteListItem(p.listId, p.itemId, u.id);
    });

    socket.on(SOCKET_EVENT_DISCONNECT, () => {});
  });
}
