export interface Subcategory {
  id: string;
  name: string;
  product_count: number;
}

export interface Category {
  id: string;
  name: string;
  icon_url: string | null;
  product_count: number;
  subcategories: Subcategory[];
}
