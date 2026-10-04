import type { SearchResponse } from "@/types/search";
import { apiClient as sharedApiClient } from "@nearcommerce/api";

export const apiClient = sharedApiClient;

export type SearchFilters = { categoryId?: string; subcategoryId?: string };

export async function searchProducts(
  query: string,
  latitude: number,
  longitude: number,
  filters: SearchFilters = {},
): Promise<SearchResponse> {
  const response = await apiClient.get<SearchResponse>("/search", {
    params: {
      q: query || undefined,
      lat: latitude,
      lng: longitude,
      category_id: filters.categoryId,
      subcategory_id: filters.subcategoryId,
    },
  });

  return response.data;
}
