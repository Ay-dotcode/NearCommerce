import { apiClient } from "@nearcommerce/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface ParsedProduct {
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
  is_published: boolean;
}

export const useImportCsv = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (products: ParsedProduct[]) => {
      const { data } = await apiClient.post("/api/products/import", {
        products,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
