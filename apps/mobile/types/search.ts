export type SearchResult = {
  id: string;
  name: string;
  price: number | string;
  image_url?: string | null;
  store_id: string;
  store_name: string;
  distance_meters: number;
  quantity: number;
  in_stock: boolean;
  isStale: boolean;
  store_latitude: number;
  store_longitude: number;
};

export type SearchResponse = {
  data: SearchResult[];
  used_fallback: boolean;
};

export type ImageSearchResponse = SearchResponse & {
  detected_query: string;
};
