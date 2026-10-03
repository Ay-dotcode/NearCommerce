import { getIO } from "@/config/socket";
import { LIST_ROOM_PREFIX, USER_ROOM_PREFIX } from "@/constants";

/**
 * Realtime fan-out is best effort: the database write already succeeded, so a socket
 * problem (server not started, Redis hiccup) must never turn into a failed HTTP request.
 */
const safely = (label: string, fn: () => void) => {
  try {
    fn();
  } catch (error) {
    console.warn(`[LIST EVENTS] ${label} skipped:`, (error as Error).message);
  }
};

const listRoom = (listId: string) => `${LIST_ROOM_PREFIX}${listId}`;
const userRoom = (userId: string) => `${USER_ROOM_PREFIX}${userId}`;

export const emitToList = (listId: string, event: string, payload: unknown) =>
  safely(event, () => getIO().to(listRoom(listId)).emit(event, payload));

export const emitToUser = (userId: string, event: string, payload: unknown) =>
  safely(event, () => getIO().to(userRoom(userId)).emit(event, payload));

/** Stops one user's sockets from receiving further events for a list (removed or left). */
export const removeUserFromListRoom = (listId: string, userId: string) =>
  safely("evict user", () =>
    getIO().in(userRoom(userId)).socketsLeave(listRoom(listId)),
  );

/** Empties a list's room after the list is deleted. */
export const closeListRoom = (listId: string) =>
  safely("close room", () =>
    getIO().in(listRoom(listId)).socketsLeave(listRoom(listId)),
  );
