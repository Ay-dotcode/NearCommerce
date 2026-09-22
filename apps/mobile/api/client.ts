import { apiClient as sharedApiClient } from "@nearcommerce/api";
import type { SearchResponse } from "@/types/search";

export const apiClient = sharedApiClient;

export async function searchProducts(
  query: string,
  latitude: number,
  longitude: number,
): Promise<SearchResponse> {
  const response = await apiClient.get<SearchResponse>("/search", {
    params: { q: query || undefined, lat: latitude, lng: longitude },
  });

  return response.data;
}
