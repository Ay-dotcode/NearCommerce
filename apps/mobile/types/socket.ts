import type { HouseholdListItem } from "@/types/lists";

export type ListServerEvents = {
  list_item_updated: (item: HouseholdListItem) => void;
};

export type ListClientEvents = {
  join_list: (listId: string) => void;
  leave_list: (listId: string) => void;
  add_item: (payload: {
    listId: string;
    productId: string;
    quantity: number;
  }) => void;
  toggle_item: (payload: {
    listId: string;
    productId: string;
    isChecked: boolean;
  }) => void;
};
