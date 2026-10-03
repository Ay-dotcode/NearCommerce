import type { Store, StorePayload } from "@/types/stores";
import { httpClient } from "@nearcommerce/api";

export const MY_STORES_KEY = ["my-stores"] as const;

export async function listMyStores(): Promise<Store[]> {
  const response = await httpClient.get<{ data: Store[] }>("/stores/mine");
  return response.data.data;
}

// Owner view of a store (includes suspended stores, unlike the public endpoint).
export async function getStore(storeId: string): Promise<Store> {
  const response = await httpClient.get<{ data: Store }>(
    `/stores/${storeId}/manage`,
  );
  return response.data.data;
}

export async function createStore(payload: StorePayload): Promise<Store> {
  const response = await httpClient.post<{ data: Store }>("/stores", payload);
  return response.data.data;
}

export async function updateStore(
  storeId: string,
  payload: Partial<StorePayload>,
): Promise<Store> {
  const response = await httpClient.patch<{ data: Store }>(
    `/stores/${storeId}`,
    payload,
  );
  return response.data.data;
}

export async function deleteStore(storeId: string): Promise<void> {
  await httpClient.delete(`/stores/${storeId}`);
}
