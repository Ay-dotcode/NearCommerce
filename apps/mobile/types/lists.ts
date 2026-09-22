export type HouseholdListItem = {
  id: string;
  list_id: string;
  product_id: string | null;
  custom_item_name: string | null;
  quantity: number;
  is_checked: boolean;
  added_by?: string | null;
  updated_at?: string;
};

export type HouseholdListMeta = {
  id: string;
  name: string;
  invite_code: string;
  role: "OWNER" | "MEMBER";
};
