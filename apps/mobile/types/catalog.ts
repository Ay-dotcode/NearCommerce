export type Subcategory = { id: string; name: string; category_id?: string };

export type Category = {
  id: string;
  name: string;
  icon_url?: string | null;
  subcategories: Subcategory[];
};

export type NearbyStore = {
  id: string;
  name: string;
  address?: string;
  distance_meters: number;
  is_open: boolean;
  rating: number;
  review_count?: number;
};
