import type { ProductImportRow, StoreProductsResponse } from "@/types/products";
import { apiClient } from "@nearcommerce/api";

export async function getStoreProducts() {
  const response = await apiClient.get<StoreProductsResponse>("/api/products");
  return response.data.data;
}

export async function confirmProductStock(productId: string) {
  const response = await apiClient.patch(`/api/products/${productId}/verify`);
  return response.data;
}

export async function importProducts(products: ProductImportRow[]) {
  const response = await apiClient.post("/api/products/import", { products });
  return response.data;
}
