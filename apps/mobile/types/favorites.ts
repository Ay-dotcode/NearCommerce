export type FavoriteItem = {
  id: string;
  type: "store" | "product";
  store_id: string | null;
  product_id: string | null;
  created_at: string;
  store?: {
    id: string;
    name: string;
    address?: string;
    is_open: boolean;
    rating: number;
    review_count: number;
  } | null;
  product?: {
    id: string;
    name: string;
    price: number;
    image_url?: string | null;
    in_stock: boolean;
    store_id: string;
    store_name: string;
  } | null;
};

export type FavoriteTarget = { storeId: string } | { productId: string };
