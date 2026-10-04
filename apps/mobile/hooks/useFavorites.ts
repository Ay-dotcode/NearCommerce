import {
  FAVORITES_KEY,
  addFavorite,
  fetchFavorites,
  removeFavorite,
} from "@/api/favorites";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Toast from "react-native-toast-message";

type Target = { storeId?: string; productId?: string };

// Favourite state for one store or product, derived from the shared favourites list.
export function useFavorite(target: Target) {
  const queryClient = useQueryClient();
  const enabled = Boolean(target.storeId || target.productId);

  const list = useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: fetchFavorites,
    enabled,
  });

  const current = list.data?.find((f) =>
    target.storeId
      ? f.store_id === target.storeId
      : f.product_id === target.productId,
  );

  const toggle = useMutation({
    mutationFn: async () =>
      current ? removeFavorite(current.id) : addFavorite(target),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FAVORITES_KEY }),
    onError: () =>
      Toast.show({
        type: "error",
        text1: "Couldn't update favorites",
        text2: "Please try again.",
      }),
  });

  return {
    isFavorite: Boolean(current),
    isLoading: list.isLoading,
    isPending: toggle.isPending,
    toggle: () => toggle.mutate(),
  };
}

export function useRemoveFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeFavorite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FAVORITES_KEY }),
    onError: () =>
      Toast.show({ type: "error", text1: "Couldn't remove favorite" }),
  });
}
