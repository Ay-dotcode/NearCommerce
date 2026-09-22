export type Store = {
  id: string;
  name: string;
  isOpen: boolean;
  rating: number;
  distance: number;
};

export type StoreProps = {
  id: string;
  name: string;
  isOpen: boolean;
  rating: number;
  distance?: number;
};

export type SearchResult = {
  id: string;
  name: string;
  price: number | string;
  image_url?: string | null;
  store_id: string;
  store_name: string;
  distance_meters: number;
};

export type SearchResponse = {
  data: SearchResult[];
  used_fallback: boolean;
};

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