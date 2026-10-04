import type { FavoriteItem } from "@/types/favorites";
import { apiClient } from "@nearcommerce/api";

export const FAVORITES_KEY = ["favorites"] as const;

export async function fetchFavorites(): Promise<FavoriteItem[]> {
  const res = await apiClient.get<{ data: FavoriteItem[] }>("/favorites");
  return res.data.data ?? [];
}

export function addFavorite(target: { storeId?: string; productId?: string }) {
  return apiClient.post("/favorites", {
    ...(target.storeId && { store_id: target.storeId }),
    ...(target.productId && { product_id: target.productId }),
  });
}

// 404 means it was already removed, which is the state we wanted.
export async function removeFavorite(favoriteId: string) {
  try {
    await apiClient.delete(`/favorites/${favoriteId}`);
  } catch (error) {
    const status = (error as { response?: { status?: number } })?.response
      ?.status;
    if (status !== 404) throw error;
  }
}
