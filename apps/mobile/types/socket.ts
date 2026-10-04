import type { HouseholdListItem } from "@/types/lists";

export type ListServerEvents = {
  list_item_updated: (item: HouseholdListItem) => void;
  list_item_removed: (payload: { id?: string; item_id?: string }) => void;
  list_updated: (payload: unknown) => void;
  list_deleted: (payload: unknown) => void;
  list_member_joined: (payload: unknown) => void;
  list_member_left: (payload: unknown) => void;
  list_access_revoked: (payload: unknown) => void;
  list_error: (payload: { message?: string }) => void;
};

export type ListClientEvents = {
  join_list: (listId: string) => void;
  leave_list: (listId: string) => void;
};
