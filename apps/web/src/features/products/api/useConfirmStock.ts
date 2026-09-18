import { apiClient } from "@nearcommerce/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useConfirmStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { data } = await apiClient.patch(
        `/api/products/${productId}/verify`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
};
