import type { Category } from "@/types/categories";
import { apiClient } from "@nearcommerce/api";

export const CATEGORIES_KEY = ["categories"] as const;

export async function listCategories(): Promise<Category[]> {
  const response = await apiClient.get<{ data: Category[] }>("/categories");
  return response.data.data;
}
