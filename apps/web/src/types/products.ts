export interface StoreProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_published: boolean;
  last_verified_at: string;
  created_at?: string;
  updated_at?: string;
  isStale?: boolean;
}

export interface ProductImportRow {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image_url: string | null;
  is_published: boolean;
}

export interface StoreProductsResponse {
  data: StoreProduct[];
}
