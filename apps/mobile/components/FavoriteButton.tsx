import { useFavorite } from "@/hooks/useFavorites";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { useColors } from "@/theme";

type Props = { storeId?: string; productId?: string };

export default function FavoriteButton({ storeId, productId }: Props) {
  const c = useColors();

  const { isFavorite, isPending, toggle } = useFavorite({ storeId, productId });
  return (
    <Pressable
      onPress={toggle}
      disabled={isPending}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        isFavorite ? "Remove from favorites" : "Add to favorites"
      }
      accessibilityState={{ selected: isFavorite, busy: isPending }}
    >
      <Ionicons
        name={isFavorite ? "heart" : "heart-outline"}
        size={28}
        color={c.heart}
      />
    </Pressable>
  );
}
