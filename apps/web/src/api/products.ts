import type {
  ImportResult,
  ProductImportRow,
  ProductListParams,
  ProductListResponse,
  ProductPayload,
  StoreProduct,
} from "@/types/products";
import { apiClient } from "@nearcommerce/api";

export async function listProducts(
  params: ProductListParams = {},
): Promise<ProductListResponse> {
  const response = await apiClient.get<ProductListResponse>("/api/products", {
    params: {
      ...params,
      q: params.q || undefined,
      status:
        params.status && params.status !== "all" ? params.status : undefined,
    },
  });
  return response.data;
}

export async function confirmProductStock(productId: string) {
  const response = await apiClient.patch(`/api/products/${productId}/verify`);
  return response.data;
}

export async function createProduct(storeId: string, payload: ProductPayload) {
  const response = await apiClient.post<{ data: StoreProduct }>(
    `/stores/${storeId}/products`,
    payload,
  );
  return response.data.data;
}

export async function updateProduct(
  storeId: string,
  productId: string,
  payload: Partial<ProductPayload>,
) {
  const response = await apiClient.patch<{ data: StoreProduct }>(
    `/api/products/${productId}`,
    payload,
    {
      headers: { "x-store-id": storeId },
    },
  );
  return response.data.data;
}

export async function deleteProduct(productId: string) {
  await apiClient.delete(`/api/products/${productId}`);
}

export async function importProducts(
  products: ProductImportRow[],
): Promise<ImportResult | null> {
  const response = await apiClient.post<{ data?: ImportResult }>(
    "/api/products/import",
    { products },
  );
  return response.data?.data ?? null;
}

// @deprecated Use listProducts. Kept so the current dashboard compiles until it is rewritten.
export async function getStoreProducts(): Promise<StoreProduct[]> {
  return (await listProducts()).data;
}
