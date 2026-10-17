import type { ImageSearchResponse, SearchResponse } from "@/types/search";
import { apiClient as sharedApiClient } from "@nearcommerce/api";

export const apiClient = sharedApiClient;

export type SearchFilters = { categoryId?: string; subcategoryId?: string };

export async function searchProducts(
  query: string,
  latitude: number,
  longitude: number,
  filters: SearchFilters = {},
  radiusMeters?: number,
  nearbyOnly = true,
): Promise<SearchResponse> {
  const response = await apiClient.get<SearchResponse>("/search", {
    params: {
      q: query || undefined,
      lat: latitude,
      lng: longitude,
      category_id: filters.categoryId,
      subcategory_id: filters.subcategoryId,
      radius_meters: radiusMeters,
      nearby_only: nearbyOnly,
    },
  });

  return response.data;
}

// Photo search: the server asks a vision model what the photo shows, then searches for it.
// Rejects with VISION_UNAVAILABLE (503) or NO_PRODUCT_DETECTED (422) in `response.data.code`.
export async function searchByImage(
  image: { base64: string; mimeType: string },
  latitude: number,
  longitude: number,
  radiusMeters?: number,
  nearbyOnly = true,
): Promise<ImageSearchResponse> {
  const response = await apiClient.post<ImageSearchResponse>("/search/image", {
    image: image.base64,
    mime_type: image.mimeType,
    lat: latitude,
    lng: longitude,
    radius_meters: radiusMeters,
    nearby_only: nearbyOnly,
  });
  return response.data;
}
