import { apiClient } from "@nearcommerce/api";
import { useQuery } from "@tanstack/react-query";

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  is_published: boolean;
  last_verified_at: string;
}

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Product[] }>(
        "/api/products",
      );
      return data.data;
    },
  });
};
