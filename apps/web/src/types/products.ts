export interface StoreProduct {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  image_url?: string | null;
  is_published: boolean;
  last_verified_at: string;
  created_at?: string;
  updated_at?: string;
  isStale?: boolean;
}

export type ProductStatusFilter = "all" | "published" | "draft" | "stale" | "out_of_stock";

export interface ProductListParams {
  q?: string;
  status?: ProductStatusFilter;
  page?: number;
  pageSize?: number;
}

export interface ProductSummary {
  total: number;
  published: number;
  drafts: number;
  outOfStock: number;
  stale: number;
}

export interface ProductListMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: ProductSummary;
}

export interface ProductListResponse {
  data: StoreProduct[];
  meta?: ProductListMeta;
}

// Body for create/update, matching the backend's camelCase product schema.
export interface ProductPayload {
  name: string;
  description?: string | null;
  price: number;
  quantity: number;
  imageUrl?: string | null;
  isPublished?: boolean;
}

export interface ProductImportRow {
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image_url: string | null;
  is_published: boolean;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  duplicatesMerged: number;
}
