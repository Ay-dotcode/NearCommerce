import { ReviewForm } from "@/forms/ReviewForm";
import { useThemedStyles, type ThemeColors } from "@/theme";
import { STACK_SCREEN_EDGES } from "@/theme/layout";
import type { ReviewTarget } from "@/types/reviews";
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// One screen for writing and editing. Params: storeId or productId, and for an
// edit also reviewId, rating and comment.
export default function ReviewScreen() {
  const styles = useThemedStyles(makeStyles);
  const params = useLocalSearchParams<{
    storeId?: string;
    productId?: string;
    reviewId?: string;
    rating?: string;
    comment?: string;
  }>();

  const target: ReviewTarget | null = params.storeId
    ? { storeId: params.storeId }
    : params.productId
      ? { productId: params.productId }
      : null;

  return (
    <SafeAreaView style={styles.container} edges={STACK_SCREEN_EDGES}>
      {target ? (
        <ReviewForm
          target={target}
          reviewId={params.reviewId}
          rating={params.rating}
          comment={params.comment}
        />
      ) : (
        <Text style={styles.muted}>Nothing to review here.</Text>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: c.surface, gap: 12 },
    muted: { color: c.textMuted, fontSize: 12, textAlign: "right" },
  });
