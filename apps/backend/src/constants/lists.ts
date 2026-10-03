export const INVITE_CODE_BYTES = 4;
export const LIST_ROOM_PREFIX = "list:";
export const USER_ROOM_PREFIX = "user:";

// Socket events: server -> client
export const LIST_EVENT_ITEM_UPDATED = "list_item_updated";
export const LIST_EVENT_ITEM_REMOVED = "list_item_removed";
export const LIST_EVENT_UPDATED = "list_updated";
export const LIST_EVENT_DELETED = "list_deleted";
export const LIST_EVENT_MEMBER_JOINED = "list_member_joined";
export const LIST_EVENT_MEMBER_LEFT = "list_member_left";
export const LIST_EVENT_ACCESS_REVOKED = "list_access_revoked";
export const LIST_EVENT_STATE = "list_state";
export const LIST_EVENT_ERROR = "list_error";

// Socket events: client -> server
export const SOCKET_EVENT_JOIN_LIST = "join_list";
export const SOCKET_EVENT_LEAVE_LIST = "leave_list";
export const SOCKET_EVENT_ADD_ITEM = "add_item";
export const SOCKET_EVENT_TOGGLE_ITEM = "toggle_item";
export const SOCKET_EVENT_REMOVE_ITEM = "remove_item";
export const SOCKET_EVENT_DISCONNECT = "disconnect";

// Abuse and size limits
export const MAX_LISTS_PER_USER = 20;
export const MAX_LIST_MEMBERS = 20;
export const MAX_LIST_ITEMS = 200;
export const INVITE_CODE_GENERATION_ATTEMPTS = 5;

// Invite codes are 8 hex chars, so joins are rate limited to make guessing impractical.
export const JOIN_LIST_RATE_LIMIT_MAX = 20; // per IP per window (RATE_LIMIT_WINDOW_MS)
