export type SearchResult = {
  id: string;
  name: string;
  price: number | string;
  image_url?: string | null;
  store_id: string;
  store_name: string;
  distance_meters: number;
};

export type SearchResponse = {
  data: SearchResult[];
  used_fallback: boolean;
};
