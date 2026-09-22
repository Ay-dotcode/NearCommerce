import { apiClient } from "@nearcommerce/api";

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

export async function getStoreProducts() {
  const response = await apiClient.get<{ data: StoreProduct[] }>(
    "/api/products",
  );
  return response.data.data;
}

export async function confirmProductStock(productId: string) {
  const response = await apiClient.patch(
    `/api/products/${productId}/confirm-stock`,
  );
  return response.data;
}

export async function importProducts(products: ProductImportRow[]) {
  const response = await apiClient.post("/api/products/import", { products });
  return response.data;
}
