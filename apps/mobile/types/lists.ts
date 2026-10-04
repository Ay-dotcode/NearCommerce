export type HouseholdListItem = {
  id: string;
  list_id: string;
  product_id: string | null;
  custom_item_name: string | null;
  item_name?: string | null;
  quantity: number;
  is_checked: boolean;
  added_by?: string | null;
  updated_at?: string;
  already_on_list?: boolean;
};

export type ListRole = "OWNER" | "MEMBER";

export type HouseholdListMeta = {
  id: string;
  name: string;
  invite_code: string;
  role: ListRole;
  member_count?: number;
  item_count?: number;
  unchecked_count?: number;
};

export type ListMember = {
  user_id: string;
  role: ListRole;
  full_name: string;
};

export type HouseholdListDetail = HouseholdListMeta & {
  members: ListMember[];
  items: HouseholdListItem[];
};

export const ALREADY_ON_LIST_MESSAGE = (quantity: number) =>
  `Item already on list. Quantity increased to ${quantity} and marked un-checked.`;
