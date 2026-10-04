import type { Category, NearbyStore } from "@/types/catalog";
import { apiClient } from "@nearcommerce/api";

export const CATEGORIES_KEY = ["categories"] as const;

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiClient.get<{ data: Category[] }>("/categories");
  return res.data.data ?? [];
}

export async function fetchNearbyStores(
  lat: number,
  lng: number,
): Promise<NearbyStore[]> {
  const res = await apiClient.get<{ data: NearbyStore[] }>("/search/stores", {
    params: { lat, lng },
  });
  return res.data.data ?? [];
}
